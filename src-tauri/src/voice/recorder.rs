use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

// What Whisper expects.
pub const RATE: u32 = 16_000;
// Cap in case the user forgets to stop.
const MAX_SECONDS: u64 = 120;

struct Active {
    stop: mpsc::Sender<()>,
    thread: JoinHandle<Result<Vec<f32>, String>>,
}

#[derive(Default)]
pub struct Recorder {
    active: Mutex<Option<Active>>,
}

impl Recorder {
    pub fn start(&self) -> Result<(), String> {
        let mut active = self.active.lock().map_err(|_| busy())?;
        if active.is_some() {
            return Err("Ya estás grabando".into());
        }
        let (stop, stop_rx) = mpsc::channel();
        let (ready, ready_rx) = mpsc::channel();
        // cpal's stream isn't Send on every platform: it lives on its own thread.
        let thread = std::thread::spawn(move || capture(stop_rx, ready));
        ready_rx.recv().map_err(|_| no_mic())?.inspect_err(|_| {
            let _ = stop.send(());
        })?;
        *active = Some(Active { stop, thread });
        Ok(())
    }

    // Returns the audio as 16 kHz mono.
    pub fn stop(&self) -> Result<Vec<f32>, String> {
        let active = self
            .active
            .lock()
            .map_err(|_| busy())?
            .take()
            .ok_or_else(|| "No estabas grabando".to_string())?;
        let _ = active.stop.send(());
        let samples = active.thread.join().map_err(|_| no_mic())??;
        // Without permission, macOS delivers silence instead of an error.
        if samples.iter().all(|s| *s == 0.0) {
            return Err(
                "Lucka no tiene permiso para usar el micrófono. Actívalo en Ajustes del sistema → Privacidad → Micrófono."
                    .into(),
            );
        }
        Ok(samples)
    }
}

fn busy() -> String {
    "El micrófono está ocupado. Intenta de nuevo.".into()
}

fn no_mic() -> String {
    "No se encontró un micrófono".into()
}

fn capture(
    stop: mpsc::Receiver<()>,
    ready: mpsc::Sender<Result<(), String>>,
) -> Result<Vec<f32>, String> {
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

    let stream = build(&device, config, channels, Arc::clone(&buffer));
    let stream = match stream.and_then(|s| s.play().map(|_| s).map_err(|_| no_mic())) {
        Ok(s) => s,
        Err(e) => {
            let _ = ready.send(Err(e.clone()));
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
) -> Result<cpal::Stream, String> {
    let on_error = |e| eprintln!("microphone: {e}");
    let push = move |frames: &mut dyn Iterator<Item = f32>| {
        if let Ok(mut b) = buffer.lock() {
            let samples: Vec<f32> = frames.collect();
            b.extend(
                samples
                    .chunks(channels)
                    .map(|c| c.iter().sum::<f32>() / c.len() as f32),
            );
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
        _ => return Err("Formato de micrófono no soportado".into()),
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
