use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use sysinfo::{ProcessesToUpdate, System};
use tauri::State;

const RECEIVER_EXE: &str = "electricity_power_monitoring_fe.exe";
const RECEIVER_ENV_VAR: &str = "GoGreen_RECEIVER_DIR";

pub struct ReceiverState(pub Mutex<Option<Child>>);

impl Default for ReceiverState {
    fn default() -> Self {
        ReceiverState(Mutex::new(None))
    }
}

/// Locate the receiver exe.
///
/// Order:
///  1. Directory from the GoGreen_RECEIVER_DIR env var (set by the installer)
///  2. Known install locations (works on first launch right after install,
///     before this process can see the newly created env var)
///  3. Dev-time path (debug builds only)
fn get_receiver_exe_path() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1. Env var written by receiver_setup.ps1
    if let Ok(dir) = std::env::var(RECEIVER_ENV_VAR) {
        if !dir.trim().is_empty() {
            candidates.push(PathBuf::from(dir).join(RECEIVER_EXE));
        }
    }

    // 2. Fixed install locations used by the installer script
    candidates.push(
        PathBuf::from(r"C:\ProgramData\GoGreen\GoGreen_Receiver").join(RECEIVER_EXE),
    );

    if let Ok(program_files) = std::env::var("ProgramFiles") {
        candidates.push(
            PathBuf::from(program_files)
                .join(r"GoGreen\GoGreen_Receiver")
                .join(RECEIVER_EXE),
        );
    }

    // 3. Dev only
    #[cfg(debug_assertions)]
    candidates.push(PathBuf::from(
        r"D:\go green led fe\out\electricity_power_monitoring_fe-win32-x64\electricity_power_monitoring_fe.exe",
    ));

    candidates.into_iter().find(|path| path.is_file())
}

#[tauri::command]
pub fn is_electron_running() -> bool {
    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    system.processes().values().any(|process| {
        let name = process.name().to_string_lossy();

        // "electron.exe" covers dev runs; the packaged receiver runs
        // under its own exe name.
        name.eq_ignore_ascii_case("electron.exe")
            || name.eq_ignore_ascii_case(RECEIVER_EXE)
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

    let Some(exe_path) = get_receiver_exe_path() else {
        return Ok(serde_json::json!({
            "success": false,
            "message": format!(
                "Receiver not found. Reinstall the app or check the {} environment variable.",
                RECEIVER_ENV_VAR
            )
        }));
    };

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
            .status();
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut system = System::new();
        system.refresh_processes(ProcessesToUpdate::All, true);
        if let Some(process) = system.process(sysinfo::Pid::from_u32(pid)) {
            process.kill();
        }
    }

    Ok(serde_json::json!({ "success": true }))
}