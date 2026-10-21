mod backend;
mod config;
mod discovery;
mod process;
mod serial;
mod terminal;
mod check_receiver;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            backend::start_backend,
            backend::stop_backend,
            backend::stop_all_backends,
            backend::backend_statuses,
            backend::backend_log_path,
            config::get_backend_configs,
            config::save_backend_configs,
            serial::scan_serial_ports,
            terminal::show_backend_terminal,
            check_receiver::is_electron_running
        ])
        .run(tauri::generate_context!())
        .expect("error while running Go Green Admin");
}