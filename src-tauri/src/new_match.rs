// src-tauri/src/new_match.rs
//
// Add to main.rs:
//   mod new_match;
//   .invoke_handler(tauri::generate_handler![
//       new_match::check_server_status,
//       new_match::find_db_path,
//       new_match::get_backup_base_dir,
//       new_match::run_new_match,
//       // ...your existing commands
//   ])
//
// Cargo.toml: add  chrono = "0.4"   (serde / serde_json you already have)
//
// Assumes your existing module that holds discover_backend_root /
// python_executable / app_data_dir is `crate::paths` — adjust the `use`
// line below if it's named differently in your project.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Window};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::process::CREATE_NO_WINDOW;
use crate::discovery::{discover_backend_root, python_executable};
use crate::backend::{backend_statuses, stop_all_backends};

// ---------------------------------------------------------------------------
// Backup destination: %ProgramData%\GoGreenEnergyMonitor\database, falling
// back to %ProgramFiles%, then %APPDATA% as a last resort. This is separate
// from app_data_dir() in paths.rs — that's your app's own state folder
// (managed_backends.json, logs); this is where match-data backups live,
// per the user's requirement that it auto-resolve instead of a folder picker.
// ---------------------------------------------------------------------------
#[tauri::command]
pub fn get_backup_base_dir() -> Result<String, String> {
    let candidates: Vec<PathBuf> = vec![
        std::env::var("ProgramData").ok().map(PathBuf::from),
        std::env::var("ProgramFiles").ok().map(PathBuf::from),
        std::env::var("APPDATA").ok().map(PathBuf::from),
    ]
    .into_iter()
    .flatten()
    .collect();

    let mut last_err: Option<String> = None;

    for base in candidates {
        let target = base.join("GoGreenEnergyMonitor").join("database");
        match fs::create_dir_all(&target) {
            Ok(_) => return Ok(target.to_string_lossy().to_string()),
            Err(e) => last_err = Some(format!("{}: {}", target.display(), e)),
        }
    }

    Err(format!(
        "Could not create a backup folder under ProgramData, Program Files, or AppData. Last error: {}",
        last_err.unwrap_or_else(|| "no candidate paths found".into())
    ))
}

#[tauri::command]
pub fn find_db_path() -> Option<String> {
    let root = discover_backend_root().ok()?;
    find_db_in(&root)
}

fn find_db_in(root: &Path) -> Option<String> {
    for name in ["db.sqlite3", "database.sqlite3"] {
        let p = root.join(name);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    find_sqlite_recursive(root).map(|p| p.to_string_lossy().to_string())
}

fn find_sqlite_recursive(dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_sqlite_recursive(&path) {
                return Some(found);
            }
        } else if path.extension().and_then(|e| e.to_str()) == Some("sqlite3") {
            return Some(path);
        }
    }
    None
}

#[derive(Serialize)]
pub struct ServerStatus {
    django: bool,
    fastapi: bool,
}

/// Reads status from your app's own process tracker (managed_backends.json
/// via backend::backend_statuses), not raw netstat — this is what
/// start_backend/stop_backend actually consider "running", so it stays
/// consistent with what the Backend Settings tab shows.
#[tauri::command]
pub fn check_server_status(app: AppHandle) -> Result<ServerStatus, String> {
    let statuses = backend_statuses(app)?;
    let running = |name: &str| {
        statuses
            .iter()
            .any(|s| s.name == name && s.running)
    };
    Ok(ServerStatus {
        django: running("django"),
        fastapi: running("fastapi"),
    })
}

fn copy_with_timestamp(db_path: &str, dest_dir: &str) -> std::io::Result<String> {
    let src = Path::new(db_path);
    let file_name = src
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "db.sqlite3".to_string());
    let ts = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let dest = Path::new(dest_dir).join(format!("{}_{}", ts, file_name));
    fs::copy(src, &dest)?;
    Ok(dest.to_string_lossy().to_string())
}

#[derive(Serialize, Clone)]
struct ProgressEvent<'a> {
    step: &'a str,
    status: &'a str,
    detail: Option<String>,
}

fn emit_progress(window: &Window, step: &str, status: &str, detail: Option<String>) {
    let _ = window.emit("new-match-progress", ProgressEvent { step, status, detail });
}

#[derive(Serialize)]
pub struct NewMatchResult {
    pub ok: bool,
    pub backup_path: Option<String>,
    pub errors: Vec<String>,
}

/// Backup current db (auto-resolved ProgramData/Program Files folder) →
/// stop any backends your app is managing (django/fastapi) → delete db →
/// `python manage.py migrate`. Backend root comes from
/// discover_backend_root(), same logic your installer / env-var setup
/// already uses — no manual path entry needed.
#[tauri::command]
pub async fn run_new_match(
    app: AppHandle,
    window: Window,
    skip_backup: bool,
) -> Result<NewMatchResult, String> {
    let mut errors: Vec<String> = Vec::new();
    let mut backup_path: Option<String> = None;

    let root = discover_backend_root()?;
    let db_path = find_db_in(&root);

    // 1. Backup
    if !skip_backup {
        if let Some(db) = &db_path {
            emit_progress(&window, "backup", "running", None);
            match get_backup_base_dir() {
                Ok(dest_dir) => match copy_with_timestamp(db, &dest_dir) {
                    Ok(dest) => {
                        backup_path = Some(dest.clone());
                        emit_progress(&window, "backup", "ok", Some(dest));
                    }
                    Err(e) => {
                        let msg = format!("Backup failed: {}", e);
                        errors.push(msg.clone());
                        emit_progress(&window, "backup", "error", Some(msg));
                    }
                },
                Err(e) => {
                    errors.push(format!("Backup failed: {}", e));
                    emit_progress(&window, "backup", "error", Some(e));
                }
            }
        } else {
            emit_progress(
                &window,
                "backup",
                "ok",
                Some("No database file found — nothing to back up.".into()),
            );
        }
    }

    // 2. Stop servers — via your app's own managed-process tracker, so the
    // taskkill is issued against the exact PID it spawned (and its state
    // file + managed_backends.json get cleared), rather than guessing from
    // netstat. This is also what fixes the stale-file-handle delete error:
    // stop_all_backends waits on the actual child process your app owns.
    let status = check_server_status(app.clone())?;
    if status.django || status.fastapi {
        emit_progress(&window, "stop", "running", None);
        match stop_all_backends(app.clone()) {
            Ok(_) => {
                // give Windows a brief moment to fully release file handles
                // after the taskkill before we touch the db file.
                std::thread::sleep(Duration::from_millis(500));
                emit_progress(&window, "stop", "ok", None);
            }
            Err(e) => {
                errors.push(format!("Could not fully stop servers: {}", e));
                emit_progress(&window, "stop", "error", Some(e));
            }
        }
    } else {
        emit_progress(&window, "stop", "ok", Some("No servers were running.".into()));
    }

    // 3. Delete db — retry a few times with backoff: on Windows a file handle
    // from the server process we just killed (or a WAL/SHM lock) can take a
    // moment to release even after the port is confirmed free.
    if let Some(db) = &db_path {
        emit_progress(&window, "delete", "running", None);
        let mut last_err: Option<String> = None;
        let mut deleted = false;

        for attempt in 0..8 {
            if attempt > 0 {
                std::thread::sleep(Duration::from_millis(400));
            }
            match fs::remove_file(db) {
                Ok(_) => {
                    deleted = true;
                    break;
                }
                Err(e) => last_err = Some(e.to_string()),
            }
        }

        // Clean up SQLite WAL/SHM sidecar files if they exist — leaving
        // them behind causes Django to resume from stale WAL data.
        for suffix in ["-wal", "-shm"] {
            let sidecar = format!("{}{}", db, suffix);
            let _ = fs::remove_file(&sidecar);
        }

        if deleted {
            emit_progress(&window, "delete", "ok", None);
        } else {
            let msg = format!(
                "Delete failed after retries: {}",
                last_err.unwrap_or_else(|| "unknown error".into())
            );
            errors.push(msg.clone());
            emit_progress(&window, "delete", "error", Some(msg));
        }
    } else {
        emit_progress(
            &window,
            "delete",
            "ok",
            Some("No database file found — skipping.".into()),
        );
    }

    // 4. Migrate — reuse your python_executable() resolution (venv/system mode)
    emit_progress(&window, "migrate", "running", None);
    let python = python_executable(&root, "venv")?;
    let migrate_result = Command::new(&python)
        .args(["manage.py", "migrate"])
        .current_dir(&root)
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match migrate_result {
        Ok(out) if out.status.success() => {
            emit_progress(&window, "migrate", "ok", None);
        }
        Ok(out) => {
            let combined = format!(
                "{}{}",
                String::from_utf8_lossy(&out.stdout),
                String::from_utf8_lossy(&out.stderr)
            );
            let truncated: String = combined.chars().take(500).collect();
            errors.push(format!("Migration failed: {}", truncated));
            emit_progress(&window, "migrate", "error", Some(truncated));
        }
        Err(e) => {
            let msg = format!("Could not run migrate: {}", e);
            errors.push(msg.clone());
            emit_progress(&window, "migrate", "error", Some(msg));
        }
    }

    Ok(NewMatchResult {
        ok: errors.is_empty(),
        backup_path,
        errors,
    })
}