#[tauri::command]
pub(super) fn scan_serial_ports() -> Result<Vec<String>, String> {
    let mut ports = serialport::available_ports()
        .map_err(|e| format!("Serial-port scan failed: {e}"))?
        .into_iter()
        .map(|port| port.port_name)
        .collect::<Vec<_>>();

    ports.sort();
    ports.dedup();

    Ok(ports)
}