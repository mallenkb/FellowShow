use std::collections::BTreeMap;

const KEYRING_SERVICE: &str = "com.openbezal.fellowshow";
const KEYRING_ACCOUNT: &str = "provider-api-keys";
const ALLOWED_KEYS: [&str; 6] = [
    "deepgramApiKey",
    "openaiApiKey",
    "groqApiKey",
    "claudeApiKey",
    "openRouterApiKey",
    "sermonOpenAiApiKey",
];

#[tauri::command]
pub async fn load_secure_settings() -> Result<BTreeMap<String, String>, String> {
    tokio::task::spawn_blocking(|| {
        let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
            .map_err(|error| format!("Could not open the system credential vault: {error}"))?;
        let serialized = match entry.get_password() {
            Ok(value) => value,
            Err(keyring::Error::NoEntry) => return Ok(BTreeMap::new()),
            Err(error) => {
                return Err(format!(
                    "Could not read provider keys from the system credential vault: {error}"
                ));
            }
        };

        let stored: BTreeMap<String, String> = serde_json::from_str(&serialized)
            .map_err(|error| format!("Stored provider keys are invalid: {error}"))?;
        Ok(sanitize_secrets(stored))
    })
    .await
    .map_err(|error| format!("Credential vault task failed: {error}"))?
}

#[tauri::command]
pub async fn save_secure_settings(secrets: BTreeMap<String, String>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let secrets = sanitize_secrets(secrets);
        let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
            .map_err(|error| format!("Could not open the system credential vault: {error}"))?;

        if secrets.is_empty() {
            return match entry.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                Err(error) => Err(format!(
                    "Could not remove provider keys from the system credential vault: {error}"
                )),
            };
        }

        let serialized = serde_json::to_string(&secrets)
            .map_err(|error| format!("Could not encode provider keys: {error}"))?;
        entry
            .set_password(&serialized)
            .map_err(|error| format!("Could not save provider keys securely: {error}"))
    })
    .await
    .map_err(|error| format!("Credential vault task failed: {error}"))?
}

fn sanitize_secrets(secrets: BTreeMap<String, String>) -> BTreeMap<String, String> {
    secrets
        .into_iter()
        .filter_map(|(key, value)| {
            let value = value.trim();
            (ALLOWED_KEYS.contains(&key.as_str()) && !value.is_empty())
                .then(|| (key, value.to_owned()))
        })
        .collect()
}
