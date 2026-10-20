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
!macroend