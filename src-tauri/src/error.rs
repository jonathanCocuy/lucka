use serde::Serialize;

// Codes, not text: the front shows them in the user's language (src/lib/i18n/en.ts, `errors`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Code {
    // Online AI
    Offline,
    BadResponse,
    KeyRejected,
    ModelNotFound,
    RateLimited,
    ProviderFailed,
    Refused,
    UnknownProvider,
    InvalidModel,
    EmptyKey,
    KeyMissing,
    KeychainFailed,
    BadFormat,
    // Local AI
    LocalModelMissing,
    LocalModelFailed,
    LocalModelBusy,
    LocalModelBroken,
    TooLong,
    // Voice
    TooShort,
    NotHeard,
    VoiceModelMissing,
    VoiceModelBroken,
    TranscriptionFailed,
    WhisperBusy,
    AlreadyRecording,
    NotRecording,
    MicDenied,
    MicBusy,
    MicMissing,
    MicUnsupported,
    // Models on disk
    AppFolderMissing,
    UnknownModel,
    DownloadFailed,
    DiskFull,
    DownloadCorrupt,
    ModelSaveFailed,
    ModelDeleteFailed,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct AppError {
    code: Code,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<u16>,
}

impl AppError {
    pub fn provider(code: Code, name: &'static str) -> Self {
        Self {
            code,
            provider: Some(name),
            status: None,
        }
    }

    pub fn with_status(mut self, status: u16) -> Self {
        self.status = Some(status);
        self
    }
}

impl From<Code> for AppError {
    fn from(code: Code) -> Self {
        Self {
            code,
            provider: None,
            status: None,
        }
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
