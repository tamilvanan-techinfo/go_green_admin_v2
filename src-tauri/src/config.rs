use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

use crate::discovery::discover_backend_root;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeterConfig {
    pub port: String,
    pub baud_rate: u32,
    /// Polling interval in seconds.
    pub poll_interval: u32,
    /// Whether this meter is provisioned in this deployment.
    /// `false` → the backend skips it entirely (no port required).
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfigs {
    pub ac: MeterConfig,
    pub dc: MeterConfig,
}

pub fn read_env_value(contents: &str, key: &str) -> Option<String> {
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

pub fn parse_env_number<T: std::str::FromStr>(
    contents: &str,
    key: &str,
    default: T,
) -> T {
    read_env_value(contents, key)
        .and_then(|value| value.parse::<T>().ok())
        .unwrap_or(default)
}

pub fn set_env_value(contents: &str, key: &str, value: &str) -> String {
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

// ---------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------

pub fn validate_meter_config(
    label: &str,
    config: &MeterConfig,
) -> Result<(), String> {
    // Disabled meters don't need port/baud/interval — that's the whole
    // point of the `enabled` flag. Skip all port-related checks.
    if !config.enabled {
        return Ok(());
    }

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

// ---------------------------------------------------------------
// READ
// ---------------------------------------------------------------

pub fn read_ac_config(root: &Path) -> Result<MeterConfig, String> {
    let path = root.join("local_folder").join("meter_config.json");

    if !path.exists() {
        return Ok(MeterConfig {
            port: String::new(),
            baud_rate: 9600,
            poll_interval: 1,
            enabled: false, // no file → not provisioned
        });
    }

    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Could not parse {}: {e}", path.display()))?;

    // Convert legacy millisecond values to seconds.
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
        // Missing `enabled` key → default to true so existing configs
        // (written before this field existed) keep working.
        enabled: value
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
    })
}

pub fn read_dc_config(root: &Path) -> Result<MeterConfig, String> {
    let path = root.join(".env");

    let contents = if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    // Convert legacy millisecond values to seconds.
    let raw_poll: u64 = read_env_value(&contents, "DC_POLL")
        .and_then(|v| v.parse().ok())
        .unwrap_or(1000);

    let poll_secs = if raw_poll >= 50 {
        (raw_poll / 1000).max(1) as u32
    } else {
        raw_poll.max(1) as u32
    };

    Ok(MeterConfig {
        port: read_env_value(&contents, "DC_COM_PORT").unwrap_or_default(),
        baud_rate: parse_env_number(&contents, "DC_BAUDRATE", 9600_u32),
        poll_interval: poll_secs,
        enabled: read_env_value(&contents, "DC_ENABLED")
            .map(|v| {
                matches!(
                    v.to_ascii_lowercase().as_str(),
                    "true" | "1" | "yes"
                )
            })
            .unwrap_or(false), // missing .env → not provisioned
    })
}

// ---------------------------------------------------------------
// TAURI COMMANDS
// ---------------------------------------------------------------

#[tauri::command]
pub fn get_backend_configs() -> Result<BackendConfigs, String> {
    let root = discover_backend_root()?;

    Ok(BackendConfigs {
        ac: read_ac_config(&root)?,
        dc: read_dc_config(&root)?,
    })
}

#[tauri::command]
pub fn save_backend_configs(
    configs: PartialBackendConfigs,
) -> Result<(), String> {
    // 1. Validate whatever the caller supplied.
    if let Some(ac) = &configs.ac {
        validate_meter_config("AC meter", ac)?;
    }
    if let Some(dc) = &configs.dc {
        validate_meter_config("DC meter", dc)?;
    }

    // 2. Resolve effective state = supplied value OR current disk value.
    //    This makes Option C work for free: if the caller only sends DC,
    //    AC is loaded from disk with its current `enabled` flag, and the
    //    collision check still runs on the full picture.
    let root = discover_backend_root()?;

    let effective_ac = configs
        .ac
        .clone()
        .or_else(|| read_ac_config(&root).ok());
    let effective_dc = configs
        .dc
        .clone()
        .or_else(|| read_dc_config(&root).ok());

    // 3. Collision rule (Option B invariant):
    //    both must be ENABLED, both must have a non-empty port,
    //    and those ports must be the same → refuse.
    if let (Some(ac), Some(dc)) = (&effective_ac, &effective_dc) {
        let ac_on = ac.enabled && !ac.port.trim().is_empty();
        let dc_on = dc.enabled && !dc.port.trim().is_empty();

        if ac_on
            && dc_on
            && ac.port.trim().eq_ignore_ascii_case(dc.port.trim())
        {
            return Err(format!(
                "AC and DC meters are both enabled on {}. \
                 Disable one, or assign them different COM ports.",
                ac.port.trim()
            ));
        }
    }

    // 4. Persist AC only when supplied.
    if let Some(ac) = &configs.ac {
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
                "AC meter configuration must be a JSON object.".to_string()
            );
        }

        ac_json["port"] = serde_json::Value::String(ac.port.clone());
        ac_json["baudrate"] = serde_json::json!(ac.baud_rate);
        ac_json["poll_interval"] = serde_json::json!(ac.poll_interval);
        ac_json["enabled"] = serde_json::json!(ac.enabled);

        fs::write(
            &ac_path,
            serde_json::to_string_pretty(&ac_json)
                .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    }

    // 5. Persist DC only when supplied.
    if let Some(dc) = &configs.dc {
        let env_path = root.join(".env");

        let env_contents = if env_path.exists() {
            fs::read_to_string(&env_path).map_err(|e| e.to_string())?
        } else {
            String::new()
        };

        let env_contents =
            set_env_value(&env_contents, "DC_COM_PORT", &dc.port);

        let env_contents = set_env_value(
            &env_contents,
            "DC_BAUDRATE",
            &dc.baud_rate.to_string(),
        );

        let env_contents = set_env_value(
            &env_contents,
            "DC_POLL",
            &dc.poll_interval.to_string(),
        );

        // Single write — the previous file wrote this twice.
        let env_contents = set_env_value(
            &env_contents,
            "DC_ENABLED",
            if dc.enabled { "true" } else { "false" },
        );

        fs::write(&env_path, env_contents).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ---------------------------------------------------------------
// PARTIAL CONFIG (frontend may send ac, dc, or both)
// ---------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartialBackendConfigs {
    pub ac: Option<MeterConfig>,
    pub dc: Option<MeterConfig>,
}