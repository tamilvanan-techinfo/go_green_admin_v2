!include "LogicLib.nsh"

!define HOOK_FILE_DIR "${__FILEDIR__}"

!macro NSIS_HOOK_POSTINSTALL
  SetDetailsView show

  DetailPrint "=========================================="
  DetailPrint "Go Green Backend Setup"
  DetailPrint "=========================================="

  SetOutPath "$PLUGINSDIR"
  File /oname=backend_setup.ps1 "${HOOK_FILE_DIR}\backend_setup.ps1"

  DetailPrint "Configuring Python and installing backend dependencies..."

  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\backend_setup.ps1" -ZipPath "$INSTDIR\resources\build_launcher.zip"'

  Pop $0

  ${If} $0 != "0"
    DetailPrint "ERROR: Go Green backend setup failed. Exit code: $0"
    MessageBox MB_ICONSTOP "Go Green backend setup failed. Check the installer details for the error."
    Abort
  ${EndIf}

  DetailPrint "Go Green backend setup completed."

  File /oname=receiver_setup.ps1 "${HOOK_FILE_DIR}\receiver_setup.ps1"
  DetailPrint "=========================================="
  DetailPrint "Go Green Receiver Setup"
  DetailPrint "=========================================="

  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\receiver_setup.ps1" -ZipPath "$INSTDIR\resources\go_green.zip" -ExperienceName "GoGreen" -ExeName "electricity_power_monitoring_fe.exe" -EnvVarName "GOGREEN_RECEIVER_DIR"'

  Pop $0

  ${If} $0 != "0"
    DetailPrint "ERROR: Go Green receiver setup failed. Exit code: $0"
    MessageBox MB_ICONSTOP "Go Green receiver setup failed. Check the installer details for the error."
    Abort
  ${EndIf}

  DetailPrint "Go Green receiver setup completed."

  ; ---- Fanpower ----
  DetailPrint "=========================================="
  DetailPrint "Fanpower Receiver Setup"
  DetailPrint "=========================================="

  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\receiver_setup.ps1" -ZipPath "$INSTDIR\resources\fanpower.zip" -ExperienceName "Fanpower" -ExeName "electricity_power_monitoring_fe.exe" -EnvVarName "FANPOWER_RECEIVER_DIR"'

  Pop $0

  ${If} $0 != "0"
    DetailPrint "ERROR: Fanpower receiver setup failed. Exit code: $0"
    MessageBox MB_ICONSTOP "Fanpower receiver setup failed. Check the installer details for the error."
    Abort
  ${EndIf}

  DetailPrint "Fanpower receiver setup completed."
!macroend