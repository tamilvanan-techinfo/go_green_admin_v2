use serde::Serialize;
use std::{
    fs::OpenOptions,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::{
    discovery::{discover_backend_root, log_path, python_executable},
    process::{
        http_responds, load_state, process_matches_backend, save_state, ManagedProcess,
        CREATE_NO_WINDOW,
    },
};

#[derive(Debug, Clone, Serialize)]
pub struct BackendStatus {
    pub name: String,
    pub port: u16,
    pub pid: Option<u32>,
    pub running: bool,
    pub healthy: bool,
    pub log_file: String,
}

/// Returns `(uvicorn_module, port, log_key)` for a named backend.
pub fn backend_info(name: &str) -> Result<(&'static str, u16, &'static str), String> {
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

#[tauri::command]
pub fn start_backend(
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

pub fn stop_one(app: &AppHandle, name: &str) -> Result<(), String> {
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
pub fn stop_backend(app: AppHandle, name: String) -> Result<(), String> {
    stop_one(&app, &name)
}

#[tauri::command]
pub fn stop_all_backends(app: AppHandle) -> Result<(), String> {
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
pub fn backend_statuses(app: AppHandle) -> Result<Vec<BackendStatus>, String> {
    let state = load_state(&app)?;
    let mut result = Vec::new();

    for (name, port, key) in [("django", 8000u16, "django"), ("fastapi", 8001, "fastapi")] {
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
pub fn backend_log_path(app: AppHandle, name: String) -> Result<String, String> {
    let (_, _, key) = backend_info(&name)?;
    Ok(log_path(&app, key)?.display().to_string())
}