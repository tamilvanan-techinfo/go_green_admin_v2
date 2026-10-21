
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use tauri::{AppHandle, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::process::CREATE_NO_WINDOW;

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
    path.join("electricity_monitoring_be").is_dir()
        && path.join("local_folder").is_dir()
}

pub fn discover_backend_root() -> Result<PathBuf, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1. Environment variable inherited by the current app.
    if let Ok(value) = std::env::var("GoGreen_BE_DIR") {
        if !value.trim().is_empty() {
            candidates.push(PathBuf::from(value.trim()));
        }
    }

    // 2. Latest saved Windows user environment variable.
    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("reg")
            .args([
                "query",
                r"HKCU\Environment",
                "/v",
                "GoGreen_BE_DIR",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout);

                if let Some(line) =
                    result.lines().find(|line| line.contains("GoGreen_BE_DIR"))
                {
                    if let Some(value) = line.split_whitespace().last() {
                        if !value.trim().is_empty() {
                            candidates.push(PathBuf::from(value.trim()));
                        }
                    }
                }
            }
        }
    }

    // 3. App-relative fallback candidates.
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
            return candidate.canonicalize().map_err(|e| {
                format!(
                    "Could not resolve backend path '{}': {e}",
                    candidate.display()
                )
            });
        }
    }

    Err(
        "Backend folder not found. Check the GoGreen_BE_DIR environment variable and backend installation."
            .to_string(),
    )
}

pub fn python_executable(
    root: &Path,
    requested_mode: &str,
) -> Result<PathBuf, String> {
    // Respect the Python mode saved by the backend installer, if present.
    let saved_mode = fs::read_to_string(root.join(".python_mode"))
        .ok()
        .map(|value| value.trim().to_string());

    let mode = saved_mode
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(requested_mode);

    match mode {
        "venv" => {
            for folder in [".venv", "venv"] {
                let candidate = root
                    .join(folder)
                    .join("Scripts")
                    .join("python.exe");

                if candidate.is_file() {
                    return Ok(candidate);
                }
            }

            Err(
                "The configured virtual environment was not found. Run the backend installer again."
                    .to_string(),
            )
        }

        "system" => {
            // Use the explicit Python path saved by the installer, if valid.
            if let Ok(value) = fs::read_to_string(root.join(".python_path")) {
                let candidate = PathBuf::from(value.trim());

                if candidate.is_file() {
                    return Ok(candidate);
                }
            }

            Ok(PathBuf::from("python"))
        }

        _ => Err(format!("Unsupported Python mode: {mode}")),
    }
}
