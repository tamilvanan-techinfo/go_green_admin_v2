use sysinfo::{ProcessesToUpdate, System};

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