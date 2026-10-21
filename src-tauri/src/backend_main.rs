#[path = "config.rs"]
mod config;

#[path = "discovery.rs"]
mod discovery;

#[path = "logs.rs"]
mod logs;

#[path = "process.rs"]
mod process;

#[path = "serial.rs"]
mod serial;

#[path = "terminal.rs"]
mod terminal;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

use std::{
    fs::OpenOptions,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

use tauri::AppHandle;

use self::{
    discovery::{discover_backend_root, log_path, python_executable},
    process::{
        backend_info, http_responds, load_state, process_matches_backend,
        save_state, BackendStatus, ManagedProcess, CREATE_NO_WINDOW,
    },
};

use std::collections::BTreeMap;

#[tauri::command]
pub(super) fn start_backend(
    app: AppHandle,
    name: String,
    python_mode: String,
) -> Result<BackendStatus, String> {
    let (module, port, key) = backend_info(&name)?;
    let root = discover_backend_root()?;
    let python = python_executable(&root, &python_mode)?;

    let mut state = load_state(&app)?;

    // Reuse a tracked backend if it is already running.
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

    // Do not start another server on a port already responding.
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

    // Wait up to eight seconds for the backend to respond.
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
    backend_info(name)?;

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

            if !output.status.success()
                && process_matches_backend(process.pid, name)
            {
                return Err(format!(
                    "Windows could not stop {name}. Check permissions and the log."
                ));
            }
        }

        #[cfg(not(windows))]
        {
            return Err(
                "This process manager currently supports Windows only."
                    .to_string(),
            );
        }
    }

    state.remove(name);
    save_state(app, &state)?;

    Ok(())
}

#[tauri::command]
pub(super) fn stop_backend(
    app: AppHandle,
    name: String,
) -> Result<(), String> {
    stop_one(&app, &name)
}

#[tauri::command]
pub(super) fn stop_all_backends(app: AppHandle) -> Result<(), String> {
    let mut errors = Vec::new();

    for name in ["django", "fastapi"] {
        if let Err(error) = stop_one(&app, name) {
            errors.push(error);
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

#[tauri::command]
pub(super) fn backend_statuses(
    app: AppHandle,
) -> Result<Vec<BackendStatus>, String> {
    let state = load_state(&app)?;
    let mut result = Vec::new();

    for (name, port, key) in [
        ("django", 8000, "django"),
        ("fastapi", 8001, "fastapi"),
    ] {
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
pub(super) fn backend_log_path(
    app: AppHandle,
    name: String,
) -> Result<String, String> {
    let (_, _, key) = backend_info(&name)?;

    Ok(log_path(&app, key)?.display().to_string())
}

// Keeps the BTreeMap type available here if you later add backend-state helpers.
#[allow(dead_code)]
fn _state_type_example(_: BTreeMap<String, ManagedProcess>) {}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            stop_all_backends,
            backend_statuses,
            backend_log_path,
            config::get_backend_configs,
            config::save_backend_configs,
            serial::scan_serial_ports,
            terminal::show_backend_terminal,
            logs::read_log_tail
        ])
        .run(tauri::generate_context!())
        .expect("error while running Go Green Admin");
}