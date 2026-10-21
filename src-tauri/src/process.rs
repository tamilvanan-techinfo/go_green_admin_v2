use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    process::Command,
    time::Duration,
};

use tauri::AppHandle;

use super::discovery::state_file;

#[cfg(windows)]
use std::os::windows::process::CommandExt;


pub(super) const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub(super) struct ManagedProcess {
    pub pid: u32,
    pub project_dir: String,
    pub python_mode: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct BackendStatus {
    pub name: String,
    pub port: u16,
    pub pid: Option<u32>,
    pub running: bool,
    pub healthy: bool,
    pub log_file: String,
}

pub(super) fn backend_info(
    name: &str,
) -> Result<(&'static str, u16, &'static str), String> {
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

pub(super) fn load_state(
    app: &AppHandle,
) -> Result<BTreeMap<String, ManagedProcess>, String> {
    let path = state_file(app)?;

    if !path.exists() {
        return Ok(BTreeMap::new());
    }

    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;

    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

pub(super) fn save_state(
    app: &AppHandle,
    state: &BTreeMap<String, ManagedProcess>,
) -> Result<(), String> {
    let path = state_file(app)?;
    let contents =
        serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;

    fs::write(path, contents).map_err(|e| e.to_string())
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

        return Some(
            String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string(),
        );
    }

    #[cfg(not(windows))]
    {
        let _ = pid;
        None
    }
}

pub(super) fn process_matches_backend(pid: u32, name: &str) -> bool {
    let Some(command_line) = process_command_line(pid) else {
        return false;
    };

    let Ok((module, _, _)) = backend_info(name) else {
        return false;
    };

    command_line.contains("uvicorn") && command_line.contains(module)
}

pub(super) fn http_responds(port: u16) -> bool {
    let address = ("127.0.0.1", port)
        .to_socket_addrs()
        .ok()
        .and_then(|mut addresses| addresses.next());

    let Some(address) = address else {
        return false;
    };

    let Ok(mut stream) =
        TcpStream::connect_timeout(&address, Duration::from_millis(700))
    else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(700)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(700)));

    if stream
        .write_all(
            b"GET /openapi.json HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
        )
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