use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

use crate::error::{AppError, Code, Result};

// What Whisper expects.
pub const RATE: u32 = 16_000;
// Cap in case the user forgets to stop.
const MAX_SECONDS: u64 = 120;

struct Active {
    stop: mpsc::Sender<()>,
    thread: JoinHandle<Result<Vec<f32>>>,
}

pub struct Recorder {
    active: Mutex<Option<Active>>,
    // RMS of the last audio chunk, as f32 bits. 0 when idle.
    level: Arc<AtomicU32>,
}

impl Default for Recorder {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
            level: Arc::new(AtomicU32::new(0)),
        }
    }
}

impl Recorder {
    pub fn start(&self) -> Result<()> {
        let mut active = self.active.lock().map_err(|_| busy())?;
        if active.is_some() {
            return Err(Code::AlreadyRecording.into());
        }
        let (stop, stop_rx) = mpsc::channel();
        let (ready, ready_rx) = mpsc::channel();
        let level = Arc::clone(&self.level);
        // cpal's stream isn't Send on every platform: it lives on its own thread.
        let thread = std::thread::spawn(move || capture(stop_rx, ready, level));
        ready_rx.recv().map_err(|_| no_mic())?.inspect_err(|_| {
            let _ = stop.send(());
        })?;
        *active = Some(Active { stop, thread });
        Ok(())
    }

    // Returns the audio as 16 kHz mono.
    pub fn stop(&self) -> Result<Vec<f32>> {
        let active = self
            .active
            .lock()
            .map_err(|_| busy())?
            .take()
            .ok_or(Code::NotRecording)?;
        let _ = active.stop.send(());
        let samples = active.thread.join().map_err(|_| no_mic())??;
        self.level.store(0f32.to_bits(), Ordering::Relaxed);
        // Without permission, macOS delivers silence instead of an error.
        if samples.iter().all(|s| *s == 0.0) {
            return Err(Code::MicDenied.into());
        }
        Ok(samples)
    }

    // RMS of the most recent audio chunk. 0.0 when idle.
    pub fn level(&self) -> f32 {
        f32::from_bits(self.level.load(Ordering::Relaxed))
    }
}

fn busy() -> AppError {
    Code::MicBusy.into()
}

fn no_mic() -> AppError {
    Code::MicMissing.into()
}

fn capture(
    stop: mpsc::Receiver<()>,
    ready: mpsc::Sender<Result<()>>,
    level: Arc<AtomicU32>,
) -> Result<Vec<f32>> {
    let device = match cpal::default_host().default_input_device() {
        Some(d) => d,
        None => {
            let _ = ready.send(Err(no_mic()));
            return Err(no_mic());
        }
    };
    let config = match device.default_input_config() {
        Ok(c) => c,
        Err(_) => {
            let _ = ready.send(Err(no_mic()));
            return Err(no_mic());
        }
    };
    let channels = usize::from(config.channels());
    let rate = config.sample_rate();
    let buffer = Arc::new(Mutex::new(Vec::<f32>::new()));

    let stream = build(&device, config, channels, Arc::clone(&buffer), level);
    let stream = match stream.and_then(|s| s.play().map(|_| s).map_err(|_| no_mic())) {
        Ok(s) => s,
        Err(e) => {
            let _ = ready.send(Err(e));
            return Err(e);
        }
    };
    let _ = ready.send(Ok(()));
    let _ = stop.recv_timeout(Duration::from_secs(MAX_SECONDS));
    drop(stream);

    let mono = std::mem::take(&mut *buffer.lock().map_err(|_| busy())?);
    Ok(resample(&mono, rate, RATE))
}

// Mixes channels down to mono in the callback so no extra audio is kept.
fn build(
    device: &cpal::Device,
    config: cpal::SupportedStreamConfig,
    channels: usize,
    buffer: Arc<Mutex<Vec<f32>>>,
    level: Arc<AtomicU32>,
) -> Result<cpal::Stream> {
    let on_error = |e| eprintln!("microphone: {e}");
    let push = move |frames: &mut dyn Iterator<Item = f32>| {
        if let Ok(mut b) = buffer.lock() {
            let samples: Vec<f32> = frames.collect();
            let mono: Vec<f32> = samples
                .chunks(channels)
                .map(|c| c.iter().sum::<f32>() / c.len() as f32)
                .collect();
            // RMS of this chunk → live level for the UI.
            if !mono.is_empty() {
                let rms = (mono.iter().map(|s| s * s).sum::<f32>() / mono.len() as f32).sqrt();
                level.store(rms.to_bits(), Ordering::Relaxed);
            }
            b.extend(mono);
        }
    };
    let format = config.sample_format();
    let config = config.config();
    let stream = match format {
        cpal::SampleFormat::F32 => device.build_input_stream(
            config,
            move |data: &[f32], _: &_| push(&mut data.iter().copied()),
            on_error,
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream(
            config,
            move |data: &[i16], _: &_| push(&mut data.iter().map(|s| f32::from(*s) / 32768.0)),
            on_error,
            None,
        ),
        cpal::SampleFormat::U16 => device.build_input_stream(
            config,
            move |data: &[u16], _: &_| {
                push(&mut data.iter().map(|s| (f32::from(*s) - 32768.0) / 32768.0))
            },
            on_error,
            None,
        ),
        _ => return Err(Code::MicUnsupported.into()),
    };
    stream.map_err(|_| no_mic())
}

// Linear interpolation: good enough for speech.
fn resample(input: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || input.is_empty() {
        return input.to_vec();
    }
    let ratio = f64::from(from) / f64::from(to);
    let len = (input.len() as f64 / ratio) as usize;
    (0..len)
        .map(|i| {
            let pos = i as f64 * ratio;
            let idx = pos as usize;
            let frac = (pos - idx as f64) as f32;
            let a = input[idx];
            let b = *input.get(idx + 1).unwrap_or(&a);
            a + (b - a) * frac
        })
        .collect()
}
