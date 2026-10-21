use serde::Serialize;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

#[derive(Debug, Serialize)]
pub(super) struct LogTailResult {
    lines: Vec<String>,
    new_offset: u64,
}

#[tauri::command]
pub(super) fn read_log_tail(
    path: String,
    offset: u64,
) -> Result<LogTailResult, String> {
    let mut file =
        File::open(&path).map_err(|e| format!("Cannot open log: {e}"))?;

    let file_len = file.metadata().map_err(|e| e.to_string())?.len();

    // Reset the offset if the log file has been truncated or rotated.
    let real_offset = if offset > file_len { 0 } else { offset };

    file.seek(SeekFrom::Start(real_offset))
        .map_err(|e| e.to_string())?;

    let mut buf = String::new();

    file.read_to_string(&mut buf)
        .map_err(|e| e.to_string())?;

    let new_offset = real_offset + buf.len() as u64;

    let lines: Vec<String> = buf
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(str::to_string)
        .collect();

    Ok(LogTailResult { lines, new_offset })
}