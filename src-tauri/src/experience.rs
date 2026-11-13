use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct ExperienceState(pub Mutex<Option<String>>);

impl Default for ExperienceState {
    fn default() -> Self {
        ExperienceState(Mutex::new(None))
    }
}

fn config_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("selected_experience.txt"))
}

#[tauri::command]
pub fn set_selected_experience(
    app: tauri::AppHandle,
    state: tauri::State<ExperienceState>,
    experience: String,
) -> Result<(), String> {
    let valid = ["go-green", "fanpower"];
    if !valid.contains(&experience.as_str()) {
        return Err(format!("Unknown experience: {experience}"));
    }

    let path = config_file_path(&app)?;
    fs::write(&path, &experience).map_err(|e| e.to_string())?;

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(experience);

    Ok(())
}

#[tauri::command]
pub fn get_selected_experience(
    app: tauri::AppHandle,
    state: tauri::State<ExperienceState>,
) -> Result<Option<String>, String> {
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(exp) = guard.as_ref() {
            return Ok(Some(exp.clone()));
        }
    }

    // fall back to disk (first call after app restart)
    let path = config_file_path(&app)?;
    if path.is_file() {
        let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let trimmed = contents.trim().to_string();
        if !trimmed.is_empty() {
            let mut guard = state.0.lock().map_err(|e| e.to_string())?;
            *guard = Some(trimmed.clone());
            return Ok(Some(trimmed));
        }
    }

    Ok(None)
}

/// Helper other modules call to get the active experience id, erroring
/// clearly if nothing has been selected yet.
pub fn require_selected_experience(
    app: &tauri::AppHandle,
    state: &tauri::State<ExperienceState>,
) -> Result<String, String> {
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(exp) = guard.as_ref() {
            return Ok(exp.clone());
        }
    }

    let path = config_file_path(app)?;
    if path.is_file() {
        let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let trimmed = contents.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(trimmed);
        }
    }

    Err("No game experience selected yet. Go to Change Game and select one.".to_string())
}