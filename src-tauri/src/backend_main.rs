#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            crate::backend::start_backend,
            crate::backend::stop_backend,
            crate::backend::stop_all_backends,
            crate::backend::backend_statuses,
            crate::backend::backend_log_path,
            crate::config::get_backend_configs,
            crate::config::save_backend_configs,
            crate::serial::scan_serial_ports,
            crate::terminal::show_backend_terminal,
            crate::logs::read_log_tail,
            crate::check_receiver::is_electron_running
        ])
        .run(tauri::generate_context!())
        .expect("error while running Go Green Admin");
}
