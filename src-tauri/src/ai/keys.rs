use keyring::Entry;

use super::Online;

// OS keychain: Keychain on macOS, Credential Manager on Windows.
const SERVICE: &str = "dev.juanramirez.lucka";

fn entry(provider: Online) -> Result<Entry, String> {
    Entry::new(SERVICE, provider.id())
        .map_err(|_| "No se pudo abrir el llavero del sistema".to_string())
}

pub fn save(provider: Online, key: &str) -> Result<(), String> {
    entry(provider)?
        .set_password(key)
        .map_err(|_| "No se pudo guardar la key en el llavero".into())
}

pub fn read(provider: Online) -> Result<String, String> {
    entry(provider)?.get_password().map_err(|_| {
        format!(
            "No hay key de {} en este equipo. Agrégala en Ajustes.",
            provider.name()
        )
    })
}

pub fn delete(provider: Online) -> Result<(), String> {
    match entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("No se pudo borrar la key del llavero".into()),
    }
}
