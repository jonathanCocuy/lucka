use keyring::Entry;

use super::Online;
use crate::error::{Code, Result};

// OS keychain: Keychain on macOS, Credential Manager on Windows.
const SERVICE: &str = "dev.juanramirez.lucka";

fn entry(provider: Online) -> Result<Entry> {
    Ok(Entry::new(SERVICE, provider.id()).map_err(|_| Code::KeychainFailed)?)
}

pub fn save(provider: Online, key: &str) -> Result<()> {
    Ok(entry(provider)?
        .set_password(key)
        .map_err(|_| Code::KeychainFailed)?)
}

pub fn read(provider: Online) -> Result<String> {
    entry(provider)?
        .get_password()
        .map_err(|_| provider.error(Code::KeyMissing))
}

pub fn delete(provider: Online) -> Result<()> {
    match entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err(Code::KeychainFailed.into()),
    }
}
