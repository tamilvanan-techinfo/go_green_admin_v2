use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use sysinfo::{ProcessesToUpdate, System};
use tauri::State;

use crate::experience::{require_selected_experience, ExperienceState};

struct ExperienceInfo {
    id: &'static str,
    exe_name: &'static str,
    env_var: &'static str,
    install_subdir: &'static str,
}

const EXPERIENCES: &[ExperienceInfo] = &[
    ExperienceInfo {
        id: "go-green",
        exe_name: "electricity_power_monitoring_fe.exe",
        env_var: "GOGREEN_RECEIVER_DIR",
        install_subdir: r"GoGreen\GoGreen_Receiver",
    },
    ExperienceInfo {
        id: "fanpower",
        exe_name: "electricity_power_monitoring_fe.exe",
        env_var: "FANPOWER_RECEIVER_DIR",
        install_subdir: r"Fanpower\Fanpower_Receiver",
    },
    
];

fn find_experience(experience: &str) -> Result<&'static ExperienceInfo, String> {
    EXPERIENCES
        .iter()
        .find(|e| e.id.eq_ignore_ascii_case(experience))
        .ok_or_else(|| format!("Unknown experience: {experience}"))
}

pub struct ReceiverState(pub Mutex<Option<(String, Child)>>);

impl Default for ReceiverState {
    fn default() -> Self {
        ReceiverState(Mutex::new(None))
    }
}

fn get_receiver_exe_path(info: &ExperienceInfo) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(dir) = std::env::var(info.env_var) {
        if !dir.trim().is_empty() {
            candidates.push(PathBuf::from(dir).join(info.exe_name));
        }
    }

    candidates.push(
        PathBuf::from(r"C:\ProgramData").join(info.install_subdir).join(info.exe_name),
    );

    if let Ok(program_files) = std::env::var("ProgramFiles") {
        candidates.push(
            PathBuf::from(program_files)
                .join(info.install_subdir)
                .join(info.exe_name),
        );
    }

    #[cfg(debug_assertions)]
    if info.id == "go-green" {
        candidates.push(PathBuf::from(
            r"D:\go green led fe\out\electricity_power_monitoring_fe-win32-x64\electricity_power_monitoring_fe.exe",
        ));
    }

    candidates.into_iter().find(|path| path.is_file())
}

#[tauri::command]
pub fn get_receiver_dir(
    app: tauri::AppHandle,
    experience_state: State<ExperienceState>,
) -> Result<String, String> {
    let experience = require_selected_experience(&app, &experience_state)?;
    let info = find_experience(&experience)?;

    if let Ok(dir) = std::env::var(info.env_var) {
        if !dir.trim().is_empty() {
            return Ok(dir);
        }
    }

    get_receiver_exe_path(info)
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| format!(
            "{} is not set and no installed receiver was found. Was the installer run correctly?",
            info.env_var
        ))
}

#[tauri::command]
pub fn is_electron_running(
    app: tauri::AppHandle,
    experience_state: State<ExperienceState>,
) -> Result<bool, String> {
    let experience = require_selected_experience(&app, &experience_state)?;
    let info = find_experience(&experience)?;

    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let running = system.processes().values().any(|process| {
        let name = process.name().to_string_lossy();
        name.eq_ignore_ascii_case("electron.exe")
            || name.eq_ignore_ascii_case(info.exe_name)
    });

    Ok(running)
}

#[tauri::command]
pub fn get_receiver_status(state: State<ReceiverState>) -> Result<serde_json::Value, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    match &*guard {
        Some((experience, _)) => Ok(serde_json::json!({
            "running": true,
            "experience": experience
        })),
        None => Ok(serde_json::json!({
            "running": false,
            "experience": null
        })),
    }
}

#[tauri::command]
pub fn start_receiver(
    app: tauri::AppHandle,
    experience_state: State<ExperienceState>,
    state: State<ReceiverState>,
) -> Result<serde_json::Value, String> {
    let experience = require_selected_experience(&app, &experience_state)?;
    let info = find_experience(&experience)?;

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some((running_experience, _)) = guard.as_ref() {
        return Ok(serde_json::json!({
            "success": false,
            "message": format!("Already running: {}", running_experience)
        }));
    }

    let Some(exe_path) = get_receiver_exe_path(info) else {
        return Ok(serde_json::json!({
            "success": false,
            "message": format!(
                "Receiver not found for {}. Reinstall the app or check the {} environment variable.",
                info.id, info.env_var
            )
        }));
    };

    let receiver_dir = exe_path
        .parent()
        .ok_or_else(|| "Could not determine receiver directory".to_string())?;

    match Command::new(&exe_path).current_dir(receiver_dir).spawn() {
        Ok(child) => {
            let pid = child.id();
            *guard = Some((info.id.to_string(), child));

            Ok(serde_json::json!({
                "success": true,
                "pid": pid,
                "experience": info.id
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

    let (_experience, child) = match guard.take() {
        Some(entry) => entry,
        None => {
            return Ok(serde_json::json!({
                "success": false,
                "message": "Not running"
            }));
        }
    };

    let pid = child.id();

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