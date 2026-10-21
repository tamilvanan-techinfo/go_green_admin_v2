use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn state_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("managed_backends.json"))
}

pub fn log_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(format!("{name}.log")))
}

pub fn looks_like_backend_root(path: &Path) -> bool {
    path.join("electricity_monitoring_be").is_dir() && path.join("local_folder").is_dir()
}

pub fn discover_backend_root() -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("GoGreen_BE_DIR") {
        let path = PathBuf::from(value);
        if looks_like_backend_root(&path) {
            return Ok(path);
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();

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
            return candidate.canonicalize().map_err(|e| e.to_string());
        }
    }

    Err(
        "Backend folder not found. Set GoGreen_BE_DIR or place the backend folder beside the app."
            .to_string(),
    )
}

pub fn python_executable(root: &Path, mode: &str) -> Result<PathBuf, String> {
    match mode {
        "venv" => {
            for folder in [".venv", "venv"] {
                let candidate = root.join(folder).join("Scripts").join("python.exe");
                if candidate.is_file() {
                    return Ok(candidate);
                }
            }
            Err("Virtual environment not found. Create .venv or venv in the backend folder, or select System Python.".to_string())
        }
        "system" => Ok(PathBuf::from("python")),
        _ => Err("Python mode must be 'venv' or 'system'.".to_string()),
    }
}