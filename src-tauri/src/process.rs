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

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

use crate::discovery::{state_file};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ManagedProcess {
    pub pid: u32,
    pub project_dir: String,
    pub python_mode: String,
}

pub fn load_state(app: &AppHandle) -> Result<BTreeMap<String, ManagedProcess>, String> {
    let path = state_file(app)?;
    if !path.exists() {
        return Ok(BTreeMap::new());
    }
    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

pub fn save_state(
    app: &AppHandle,
    state: &BTreeMap<String, ManagedProcess>,
) -> Result<(), String> {
    let path = state_file(app)?;
    let contents = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, contents).map_err(|e| e.to_string())
}

pub fn process_command_line(pid: u32) -> Option<String> {
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

pub fn process_matches_backend(pid: u32, name: &str) -> bool {
    let Some(command_line) = process_command_line(pid) else {
        return false;
    };

    let Ok((module, _, _)) = crate::backend::backend_info(name) else {
        return false;
    };

    command_line.contains("uvicorn") && command_line.contains(module)
}

pub fn http_responds(port: u16) -> bool {
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