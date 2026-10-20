use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs::{self,File, OpenOptions},
    io::{Read,Seek, SeekFrom, Write},
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
#[cfg(windows)]
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;


#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct ManagedProcess {
    pid: u32,
    project_dir: String,
    python_mode: String,
}

#[derive(Debug, Clone, Serialize)]
struct BackendStatus {
    name: String,
    port: u16,
    pid: Option<u32>,
    running: bool,
    healthy: bool,
    log_file: String,
}

fn backend_info(name: &str) -> Result<(&'static str, u16, &'static str), String> {
    match name {
        "django" => Ok((
            "electricity_monitoring_be.application:application",
            8000,
            "django",
        )),
        "fastapi" => Ok(("local_folder.main:app", 8001, "fastapi")),
        _ => Err(format!("Unknown backend: {name}")),
    }
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn state_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("managed_backends.json"))
}

fn load_state(app: &AppHandle) -> Result<BTreeMap<String, ManagedProcess>, String> {
    let path = state_file(app)?;
    if !path.exists() {
        return Ok(BTreeMap::new());
    }
    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}


fn save_state(
    app: &AppHandle,
    state: &BTreeMap<String, ManagedProcess>,
) -> Result<(), String> {
    let path = state_file(app)?;
    let contents = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, contents).map_err(|e| e.to_string())
}

fn looks_like_backend_root(path: &Path) -> bool {
    path.join("electricity_monitoring_be").is_dir()
        && path.join("local_folder").is_dir()
}
fn discover_backend_root() -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1. Check the environment inherited by the current app process.
    if let Ok(value) = std::env::var("GoGreen_BE_DIR") {
        if !value.trim().is_empty() {
            candidates.push(PathBuf::from(value.trim()));
        }
    }

    // 2. Read the latest saved Windows user environment variable.
    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("reg")
            .args([
                "query",
                r"HKCU\Environment",
                "/v",
                "GoGreen_BE_DIR",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout);

                if let Some(line) = result.lines().find(|line| {
                    line.contains("GoGreen_BE_DIR")
                }) {
                    if let Some(value) = line.split_whitespace().last() {
                        if !value.trim().is_empty() {
                            candidates.push(PathBuf::from(value.trim()));
                        }
                    }
                }
            }
        }
    }

    // 3. Preserve app-relative discovery as a fallback.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.extend(parent.ancestors().map(Path::to_path_buf));
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidates.extend(cwd.ancestors().map(Path::to_path_buf));
    }

    let mut expanded = candidates.clone();

    for base in &candidates {
        expanded.push(base.join("backend"));
        expanded.push(base.join("GoGreen_BE"));
        expanded.push(base.join("go_green_backend"));
    }

    for candidate in expanded {
        if looks_like_backend_root(&candidate) {
            return candidate.canonicalize().map_err(|e| {
                format!(
                    "Could not resolve backend path '{}': {e}",
                    candidate.display()
                )
            });
        }
    }

    Err(
        "Backend folder not found. Check the GoGreen_BE_DIR environment variable and backend installation."
            .to_string(),
    )
}

fn python_executable(root: &Path, requested_mode: &str) -> Result<PathBuf, String> {
    let saved_mode = fs::read_to_string(root.join(".python_mode"))
        .ok()
        .map(|value| value.trim().to_string());

    let mode = saved_mode
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(requested_mode);

    match mode {
        "venv" => {
            for folder in [".venv", "venv"] {
                let candidate = root
                    .join(folder)
                    .join("Scripts")
                    .join("python.exe");

                if candidate.is_file() {
                    return Ok(candidate);
                }
            }

            Err(
                "The configured virtual environment was not found. Run the backend installer again."
                    .to_string(),
            )
        }

        "system" => {
            if let Ok(value) = fs::read_to_string(root.join(".python_path")) {
                let candidate = PathBuf::from(value.trim());

                if candidate.is_file() {
                    return Ok(candidate);
                }
            }

            // Fallback for a system Python already available on PATH.
            Ok(PathBuf::from("python"))
        }

        _ => Err(format!("Unsupported Python mode: {mode}")),
    }
}

fn log_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(format!("{name}.log")))
}

fn process_command_line(pid: u32) -> Option<String> {
    #[cfg(windows)]
    {
        let filter = format!("ProcessId = {pid}");
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Get-CimInstance Win32_Process -Filter \"{filter}\" | ForEach-Object {{ $_.CommandLine }}"
                ),
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }

    #[cfg(not(windows))]
    {
        let _ = pid;
        None
    }
}

fn process_matches_backend(pid: u32, name: &str) -> bool {
    let Some(command_line) = process_command_line(pid) else {
        return false;
    };

    let Ok((module, _, _)) = backend_info(name) else {
        return false;
    };

    command_line.contains("uvicorn") && command_line.contains(module)
}

fn http_responds(port: u16) -> bool {
    let address = ("127.0.0.1", port)
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next());

    let Some(address) = address else {
        return false;
    };

    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(700)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(700)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(700)));

    if stream
        .write_all(b"GET /openapi.json HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }

    let mut response = [0_u8; 128];
    let Ok(count) = stream.read(&mut response) else {
        return false;
    };

    let first_line = String::from_utf8_lossy(&response[..count]);
    first_line.starts_with("HTTP/1.")
}

#[tauri::command]
fn start_backend(
    app: AppHandle,
    name: String,
    python_mode: String,
) -> Result<BackendStatus, String> {
    let (module, port, key) = backend_info(&name)?;
    let root = discover_backend_root()?;
    let python = python_executable(&root, &python_mode)?;

    let mut state = load_state(&app)?;

    // Reconnect to an existing process instead of creating a duplicate.
    if let Some(existing) = state.get(&name) {
        if process_matches_backend(existing.pid, &name) {
            return Ok(BackendStatus {
                name,
                port,
                pid: Some(existing.pid),
                running: true,
                healthy: http_responds(port),
                log_file: log_path(&app, key)?.display().to_string(),
            });
        }
    }

    // Never start a second server on a port owned by another process.
    if http_responds(port) {
        return Err(format!(
            "Port {port} is already responding, but this app cannot verify that it owns that process. Stop the existing server or free the port first."
        ));
    }

    let log = log_path(&app, key)?;
    let stdout_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log)
        .map_err(|e| e.to_string())?;
    let stderr_file = stdout_file.try_clone().map_err(|e| e.to_string())?;

    let mut command = Command::new(&python);
    command
        .current_dir(&root)
        .arg("-m")
        .arg("uvicorn")
        .arg(module)
        .arg("--host")
        .arg("0.0.0.0")
        .arg("--port")
        .arg(port.to_string())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file));

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let child = command.spawn().map_err(|e| {
        format!(
            "Could not start {name} with Python '{}': {e}",
            python.display()
        )
    })?;

    let pid = child.id();

    state.insert(
        name.clone(),
        ManagedProcess {
            pid,
            project_dir: root.display().to_string(),
            python_mode,
        },
    );
    save_state(&app, &state)?;

    let deadline = Instant::now() + Duration::from_secs(8);
    while Instant::now() < deadline {
        if http_responds(port) {
            break;
        }
        thread::sleep(Duration::from_millis(250));
    }

    Ok(BackendStatus {
        name,
        port,
        pid: Some(pid),
        running: process_matches_backend(pid, key),
        healthy: http_responds(port),
        log_file: log.display().to_string(),
    })
}

fn stop_one(app: &AppHandle, name: &str) -> Result<(), String> {
    let (_, _, _) = backend_info(name)?;
    let mut state = load_state(app)?;

    let Some(process) = state.get(name).cloned() else {
        return Ok(());
    };

    if process_matches_backend(process.pid, name) {
        #[cfg(windows)]
        {
            let output = Command::new("taskkill")
                .args(["/PID", &process.pid.to_string(), "/T", "/F"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| format!("Could not stop {name}: {e}"))?;

            if !output.status.success() && process_matches_backend(process.pid, name) {
                return Err(format!(
                    "Windows could not stop {name}. Check permissions and the log."
                ));
            }
        }

        #[cfg(not(windows))]
        {
            return Err("This process manager currently supports Windows only.".to_string());
        }
    }

    state.remove(name);
    save_state(app, &state)?;
    Ok(())
}

#[tauri::command]
fn stop_backend(app: AppHandle, name: String) -> Result<(), String> {
    stop_one(&app, &name)
}

#[tauri::command]
fn stop_all_backends(app: AppHandle) -> Result<(), String> {
    let mut errors = Vec::new();
    for name in ["django", "fastapi"] {
        if let Err(error) = stop_one(&app, name) {
            errors.push(error);
        }
    }
    if errors.is_empty() { Ok(()) } else { Err(errors.join("\n")) }
}

#[tauri::command]
fn show_backend_terminal(app: AppHandle, name: String) -> Result<(), String> {
    let (_, _, key) = backend_info(&name)?;
    let log = log_path(&app, key)?;
    let log_str = log.display().to_string();

    #[cfg(windows)]
    {
        Command::new("powershell")
            .args([
                "-NoExit",
                "-Command",
                &format!("Get-Content -Wait -Tail 50 '{log_str}'"),
            ])
            .creation_flags(0x00000010) // CREATE_NEW_CONSOLE
            .spawn()
            .map_err(|e| format!("Could not open terminal: {e}"))?;
    }

    #[cfg(not(windows))]
    {
        Command::new("xterm")
            .args(["-e", "tail", "-f", &log_str])
            .spawn()
            .map_err(|e| format!("Could not open terminal: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
fn backend_statuses(app: AppHandle) -> Result<Vec<BackendStatus>, String> {
    let state = load_state(&app)?;
    let mut result = Vec::new();

    for (name, port, key) in [("django", 8000, "django"), ("fastapi", 8001, "fastapi")] {
        let managed_pid = state.get(name).map(|p| p.pid);
        let running = managed_pid
            .map(|pid| process_matches_backend(pid, key))
            .unwrap_or(false);

        result.push(BackendStatus {
            name: name.to_string(),
            port,
            pid: if running { managed_pid } else { None },
            running,
            healthy: running && http_responds(port),
            log_file: log_path(&app, key)?.display().to_string(),
        });
    }

    Ok(result)
}

#[tauri::command]
fn backend_log_path(app: AppHandle, name: String) -> Result<String, String> {
    let (_, _, key) = backend_info(&name)?;
    Ok(log_path(&app, key)?.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]

// ─── Meter config ─────────────────────────────────────────────────────────────
// poll_interval is stored and transmitted in SECONDS (integer).
// The backend Python code receives seconds directly.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MeterConfig {
    port: String,
    baud_rate: u32,
    /// Polling interval in seconds (e.g. 1 = 1 s, 5 = 5 s)
    poll_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BackendConfigs {
    ac: MeterConfig,
    dc: MeterConfig,
}

fn read_env_value(contents: &str, key: &str) -> Option<String> {
    contents.lines().find_map(|line| {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            return None;
        }
        let (left, right) = line.split_once('=')?;
        if left.trim() == key {
            Some(right.trim().trim_matches('"').trim_matches('\'').to_string())
        } else {
            None
        }
    })
}

fn parse_env_number<T: std::str::FromStr>(contents: &str, key: &str, default: T) -> T {
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
            poll_interval: 1,   // default: 1 second
        });
    }

    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Could not parse {}: {e}", path.display()))?;

    // Support old files that stored milliseconds (>= 50) by converting them.
    // New files store seconds (<= 3600 max reasonable value).
    let raw_poll = value
        .get("poll_interval")
        .and_then(|v| v.as_u64())
        .unwrap_or(1000);
    let poll_secs = if raw_poll >= 50 {
        // old ms value — convert once on read, will be written back as seconds
        (raw_poll / 1000).max(1) as u32
    } else {
        raw_poll.max(1) as u32
    };

    Ok(MeterConfig {
        port: value.get("port").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        baud_rate: value.get("baudrate").and_then(|v| v.as_u64()).unwrap_or(9600) as u32,
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

    // Same ms→s migration for .env values.
    let raw_poll: u64 = read_env_value(&contents, "DC_POLL")
        .and_then(|v| v.parse().ok())
        .unwrap_or(1000);
    let poll_secs = if raw_poll >= 50 {
        (raw_poll / 1000).max(1) as u32
    } else {
        raw_poll.max(1) as u32
    } as u32;

    Ok(MeterConfig {
        port: read_env_value(&contents, "DC_COM_PORT").unwrap_or_default(),
        baud_rate: parse_env_number(&contents, "DC_BAUDRATE", 9600_u32),
        poll_interval: poll_secs,
    })
}

#[tauri::command]
fn get_backend_configs() -> Result<BackendConfigs, String> {
    let root = discover_backend_root()?;
    Ok(BackendConfigs {
        ac: read_ac_config(&root)?,
        dc: read_dc_config(&root)?,
    })
}

#[tauri::command]
fn scan_serial_ports() -> Result<Vec<String>, String> {
    let mut ports = serialport::available_ports()
        .map_err(|e| format!("Serial-port scan failed: {e}"))?
        .into_iter()
        .map(|port| port.port_name)
        .collect::<Vec<_>>();
    ports.sort();
    ports.dedup();
    Ok(ports)
}

fn validate_meter_config(label: &str, config: &MeterConfig) -> Result<(), String> {
    if config.port.trim().is_empty() {
        return Err(format!("Select a COM port for {label}."));
    }
    if config.baud_rate == 0 {
        return Err(format!("Baud rate for {label} must be greater than zero."));
    }
    // poll_interval is in seconds; require at least 1 s, cap sanely at 3600 s (1 hour)
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
fn save_backend_configs(configs: BackendConfigs) -> Result<(), String> {
    validate_meter_config("AC meter", &configs.ac)?;
    validate_meter_config("DC meter", &configs.dc)?;

    let root = discover_backend_root()?;

    // ── AC: meter_config.json — write poll_interval in seconds ──
    let ac_path = root.join("local_folder").join("meter_config.json");
    if let Some(parent) = ac_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut ac_json = if ac_path.exists() {
        let contents = fs::read_to_string(&ac_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<serde_json::Value>(&contents)
            .map_err(|e| format!("Invalid AC meter JSON: {e}"))?
    } else {
        serde_json::json!({})
    };

    if !ac_json.is_object() {
        return Err("AC meter configuration must be a JSON object.".to_string());
    }

    ac_json["port"]          = serde_json::Value::String(configs.ac.port.clone());
    ac_json["baudrate"]      = serde_json::json!(configs.ac.baud_rate);
    ac_json["poll_interval"] = serde_json::json!(configs.ac.poll_interval); // seconds

    fs::write(&ac_path, serde_json::to_string_pretty(&ac_json).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;

    // ── DC: .env — write DC_POLL in seconds ──
    let env_path = root.join(".env");
    let env_contents = if env_path.exists() {
        fs::read_to_string(&env_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let env_contents = set_env_value(&env_contents, "DC_COM_PORT", &configs.dc.port);
    let env_contents = set_env_value(&env_contents, "DC_BAUDRATE", &configs.dc.baud_rate.to_string());
    let env_contents = set_env_value(&env_contents, "DC_POLL", &configs.dc.poll_interval.to_string()); // seconds

    fs::write(&env_path, env_contents).map_err(|e| e.to_string())?;
    Ok(())
}


#[derive(Debug, Serialize)]
struct LogTailResult {
    lines: Vec<String>,
    new_offset: u64,
}

#[tauri::command]
fn read_log_tail(path: String, offset: u64) -> Result<LogTailResult, String> {
    let mut file = File::open(&path).map_err(|e| format!("Cannot open log: {e}"))?;
    let file_len = file.metadata().map_err(|e| e.to_string())?.len();
    let real_offset = if offset > file_len { 0 } else { offset }; // handles log rotation
    file.seek(SeekFrom::Start(real_offset)).map_err(|e| e.to_string())?;
    let mut buf = String::new();
    file.read_to_string(&mut buf).map_err(|e| e.to_string())?;
    let new_offset = real_offset + buf.len() as u64;
    let lines: Vec<String> = buf.lines().filter(|l| !l.trim().is_empty()).map(|l| l.to_string()).collect();
    Ok(LogTailResult { lines, new_offset })
}



pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            stop_all_backends,
            backend_statuses,
            backend_log_path,
            get_backend_configs,
            save_backend_configs,
            scan_serial_ports,
            show_backend_terminal,
            read_log_tail
        ])
        .run(tauri::generate_context!())
        
        .expect("error while running Go Green Admin");
        
}