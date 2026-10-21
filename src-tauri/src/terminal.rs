use std::process::Command;
use tauri::AppHandle;

use crate::{
    backend::backend_info,
    discovery::log_path,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub fn show_backend_terminal(
    app: AppHandle,
    name: String,
) -> Result<(), String> {
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