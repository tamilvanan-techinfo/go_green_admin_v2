use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use sysinfo::{ProcessesToUpdate, System};
use tauri::State;

pub struct ReceiverState(pub Mutex<Option<Child>>);

impl Default for ReceiverState {
    fn default() -> Self {
        ReceiverState(Mutex::new(None))
    }
}

// Dev-time hardcoded path. Once bundling is wired up, replace this with
// a path resolved from the extracted resource directory instead.
fn get_receiver_exe_path() -> PathBuf {
    PathBuf::from(
        r"D:\go green led fe\out\electricity_power_monitoring_fe-win32-x64\electricity_power_monitoring_fe.exe",
    )
}

#[tauri::command]
pub fn is_electron_running() -> bool {
    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    system.processes().values().any(|process| {
        process
            .name()
            .to_string_lossy()
            .eq_ignore_ascii_case("electron.exe")
    })
}

#[tauri::command]
pub fn get_receiver_status(state: State<ReceiverState>) -> Result<bool, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.is_some())
}

#[tauri::command]
pub fn start_receiver(state: State<ReceiverState>) -> Result<serde_json::Value, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if guard.is_some() {
        return Ok(serde_json::json!({
            "success": false,
            "message": "Already running"
        }));
    }

    let exe_path = get_receiver_exe_path();

    if !exe_path.exists() {
        return Ok(serde_json::json!({
            "success": false,
            "message": format!("Receiver exe not found at {:?}", exe_path)
        }));
    }

    let receiver_dir = exe_path
        .parent()
        .ok_or_else(|| "Could not determine receiver directory".to_string())?;

    match Command::new(&exe_path).current_dir(receiver_dir).spawn() {
        Ok(child) => {
            let pid = child.id();
            *guard = Some(child);

            Ok(serde_json::json!({
                "success": true,
                "pid": pid
            }))
        }
        Err(err) => Ok(serde_json::json!({
            "success": false,
            "message": err.to_string()
        })),
    }
}

#[tauri::command]
pub fn stop_receiver(state: State<ReceiverState>) -> Result<serde_json::Value, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    let child = match guard.take() {
        Some(child) => child,
        None => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Not running"
            }));
        }
    };

    let pid = child.id();

    // Kill the whole process tree (the receiver spawns child renderer
    // processes, same as the old Electron setup did).
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(["/pid", &pid.to_string(), "/f", "/t"])
            .spawn();
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut system = System::new();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        if let Some(process) = system.process(sysinfo::Pid::from_u32(pid)) {
            process.kill();
        }
    }

    Ok(serde_json::json!({ "success": true }))
}