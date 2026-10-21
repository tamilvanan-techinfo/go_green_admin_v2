use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

use super::discovery::discover_backend_root;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct MeterConfig {
    pub port: String,
    pub baud_rate: u32,
    /// Polling interval in seconds.
    pub poll_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(super) struct BackendConfigs {
    pub ac: MeterConfig,
    pub dc: MeterConfig,
}

fn read_env_value(contents: &str, key: &str) -> Option<String> {
    contents.lines().find_map(|line| {
        let line = line.trim();

        if line.is_empty() || line.starts_with('#') {
            return None;
        }

        let (left, right) = line.split_once('=')?;

        if left.trim() == key {
            Some(
                right
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            )
        } else {
            None
        }
    })
}

fn parse_env_number<T: std::str::FromStr>(
    contents: &str,
    key: &str,
    default: T,
) -> T {
    read_env_value(contents, key)
        .and_then(|value| value.parse::<T>().ok())
        .unwrap_or(default)
}

fn read_ac_config(root: &Path) -> Result<MeterConfig, String> {
    let path = root.join("local_folder").join("meter_config.json");

    if !path.exists() {
        return Ok(MeterConfig {
            port: String::new(),
            baud_rate: 9600,
            poll_interval: 1,
        });
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Could not parse {}: {e}", path.display()))?;

    // Convert older millisecond values to seconds.
    let raw_poll = value
        .get("poll_interval")
        .and_then(|v| v.as_u64())
        .unwrap_or(1000);

    let poll_secs = if raw_poll >= 50 {
        (raw_poll / 1000).max(1) as u32
    } else {
        raw_poll.max(1) as u32
    };

    Ok(MeterConfig {
        port: value
            .get("port")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        baud_rate: value
            .get("baudrate")
            .and_then(|v| v.as_u64())
            .unwrap_or(9600) as u32,
        poll_interval: poll_secs,
    })
}

fn read_dc_config(root: &Path) -> Result<MeterConfig, String> {
    let path = root.join(".env");

    let contents = if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let raw_poll: u64 = read_env_value(&contents, "DC_POLL")
        .and_then(|v| v.parse().ok())
        .unwrap_or(1000);

    let poll_secs = if raw_poll >= 50 {
        (raw_poll / 1000).max(1) as u32
    } else {
        raw_poll.max(1) as u32
    };

    Ok(MeterConfig {
        port: read_env_value(&contents, "DC_COM_PORT")
            .unwrap_or_default(),
        baud_rate: parse_env_number(
            &contents,
            "DC_BAUDRATE",
            9600_u32,
        ),
        poll_interval: poll_secs,
    })
}

#[tauri::command]
pub(super) fn get_backend_configs() -> Result<BackendConfigs, String> {
    let root = discover_backend_root()?;

    Ok(BackendConfigs {
        ac: read_ac_config(&root)?,
        dc: read_dc_config(&root)?,
    })
}

fn validate_meter_config(
    label: &str,
    config: &MeterConfig,
) -> Result<(), String> {
    if config.port.trim().is_empty() {
        return Err(format!("Select a COM port for {label}."));
    }

    if config.baud_rate == 0 {
        return Err(format!(
            "Baud rate for {label} must be greater than zero."
        ));
    }

    if config.poll_interval < 1 || config.poll_interval > 3600 {
        return Err(format!(
            "Polling interval for {label} must be between 1 and 3600 seconds."
        ));
    }

    Ok(())
}

fn set_env_value(contents: &str, key: &str, value: &str) -> String {
    let mut output = Vec::new();
    let mut found = false;

    for line in contents.lines() {
        let matches_key = line
            .split_once('=')
            .map(|(left, _)| left.trim() == key)
            .unwrap_or(false);

        if matches_key {
            output.push(format!("{key}={value}"));
            found = true;
        } else {
            output.push(line.to_string());
        }
    }

    if !found {
        output.push(format!("{key}={value}"));
    }

    let mut result = output.join("\n");
    result.push('\n');

    result
}

#[tauri::command]
pub(super) fn save_backend_configs(
    configs: BackendConfigs,
) -> Result<(), String> {
    validate_meter_config("AC meter", &configs.ac)?;
    validate_meter_config("DC meter", &configs.dc)?;

    let root = discover_backend_root()?;

    // AC configuration: local_folder/meter_config.json
    let ac_path = root.join("local_folder").join("meter_config.json");

    if let Some(parent) = ac_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut ac_json = if ac_path.exists() {
        let contents =
            fs::read_to_string(&ac_path).map_err(|e| e.to_string())?;

        serde_json::from_str::<serde_json::Value>(&contents)
            .map_err(|e| format!("Invalid AC meter JSON: {e}"))?
    } else {
        serde_json::json!({})
    };

    if !ac_json.is_object() {
        return Err(
            "AC meter configuration must be a JSON object.".to_string(),
        );
    }

    ac_json["port"] = serde_json::Value::String(configs.ac.port.clone());
    ac_json["baudrate"] = serde_json::json!(configs.ac.baud_rate);
    ac_json["poll_interval"] =
        serde_json::json!(configs.ac.poll_interval);

    fs::write(
        &ac_path,
        serde_json::to_string_pretty(&ac_json)
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    // DC configuration: backend root .env
    let env_path = root.join(".env");

    let env_contents = if env_path.exists() {
        fs::read_to_string(&env_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let env_contents =
        set_env_value(&env_contents, "DC_COM_PORT", &configs.dc.port);

    let env_contents = set_env_value(
        &env_contents,
        "DC_BAUDRATE",
        &configs.dc.baud_rate.to_string(),
    );

    let env_contents = set_env_value(
        &env_contents,
        "DC_POLL",
        &configs.dc.poll_interval.to_string(),
    );

    fs::write(&env_path, env_contents).map_err(|e| e.to_string())?;

    Ok(())
}