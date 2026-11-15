use std::time::Duration;

use serde::Deserialize;

const DEEPGRAM_MODELS: &[&str] = &["nova-3", "nova-2"];
const OPENAI_MODELS: &[&str] = &[
    fellowshow_stt::OPENAI_LIVE_MODEL,
    "gpt-transcribe",
    "gpt-4o-mini-transcribe",
    "gpt-4o-transcribe",
];
const GROQ_MODELS: &[&str] = &["whisper-large-v3-turbo", "whisper-large-v3"];

fn supported_models(provider: &str) -> Result<&'static [&'static str], String> {
    match provider {
        "deepgram" => Ok(DEEPGRAM_MODELS),
        "openai" => Ok(OPENAI_MODELS),
        "groq" => Ok(GROQ_MODELS),
        _ => Err("Choose a cloud transcription provider.".into()),
    }
}

pub(super) fn resolve_model(
    provider: &str,
    requested: Option<&str>,
) -> Result<&'static str, String> {
    let supported = supported_models(provider)?;
    if let Some(model) = requested {
        return supported
            .iter()
            .copied()
            .find(|id| *id == model)
            .ok_or_else(|| "Choose a supported model in Live transcript settings.".into());
    }
    supported
        .first()
        .copied()
        .ok_or_else(|| "No transcription model is configured.".into())
}

#[derive(Deserialize)]
struct ApiModels {
    data: Vec<ApiModel>,
}

#[derive(Deserialize)]
struct ApiModel {
    id: String,
}

#[derive(Deserialize)]
struct DeepgramModels {
    stt: Vec<DeepgramModel>,
}

#[derive(Deserialize)]
struct DeepgramModel {
    canonical_name: String,
    streaming: bool,
}

#[tauri::command]
pub async fn list_cloud_transcription_models(
    provider: String,
    api_key: String,
) -> Result<Vec<&'static str>, String> {
    let supported = supported_models(&provider)?;
    let (url, key_env, name) = match provider.as_str() {
        "deepgram" => ("https://api.deepgram.com/v1/models", None, "Deepgram"),
        "openai" => (
            "https://api.openai.com/v1/models",
            Some("OPENAI_API_KEY"),
            "OpenAI",
        ),
        "groq" => (
            "https://api.groq.com/openai/v1/models",
            Some("GROQ_API_KEY"),
            "Groq",
        ),
        _ => return Err("Choose a cloud transcription provider.".into()),
    };
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|error| error.to_string())?;
    let mut request = client.get(url);
    if let Some(key_env) = key_env {
        let key = if api_key.trim().is_empty() {
            std::env::var(key_env).unwrap_or_default()
        } else {
            api_key.trim().to_owned()
        };
        if key.is_empty() {
            return Err(format!("Enter a {name} API key to load models."));
        }
        request = request.bearer_auth(key);
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("Could not reach {name}: {}", error.without_url()))?;
    if !response.status().is_success() {
        return Err(format!(
            "{name} could not list models (HTTP {}).",
            response.status().as_u16()
        ));
    }

    let advertised = if provider == "deepgram" {
        let models: DeepgramModels = response
            .json()
            .await
            .map_err(|_| "Deepgram returned an invalid model list.")?;
        models
            .stt
            .into_iter()
            .filter(|model| model.streaming)
            .map(|model| match model.canonical_name.as_str() {
                "nova-3-general" => "nova-3".into(),
                "nova-2-general" => "nova-2".into(),
                _ => model.canonical_name,
            })
            .collect::<Vec<_>>()
    } else {
        let models: ApiModels = response
            .json()
            .await
            .map_err(|_| format!("{name} returned an invalid model list."))?;
        models
            .data
            .into_iter()
            .map(|model| model.id)
            .collect::<Vec<_>>()
    };
    let replacements: &[(&str, &[&str])] = match provider.as_str() {
        "deepgram" => &[("nova-3", &["nova-2"])],
        "openai" => &[(
            "gpt-transcribe",
            &["gpt-4o-transcribe", "gpt-4o-mini-transcribe"],
        )],
        _ => &[],
    };
    let superseded = |id: &str| {
        replacements
            .iter()
            .any(|(new, older)| older.contains(&id) && advertised.iter().any(|model| model == *new))
    };
    Ok(supported
        .iter()
        .copied()
        .filter(|id| !superseded(id) && advertised.iter().any(|model| model == *id))
        .collect())
}
