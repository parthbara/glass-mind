$ErrorActionPreference = "Stop"

$TargetFile = "$PSScriptRoot\launcher.ps1"
$ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GlassMindWatcher.lnk"

try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$TargetFile`""
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.IconLocation = "powershell.exe,0"
    $Shortcut.Save()

    Write-Host "Success! Glass Mind Watcher will now ask to run when you log in."
    Write-Host "Shortcut created at: $ShortcutPath"
    Write-Host "To test it now, run: .\launcher.ps1"
}
catch {
    Write-Error "Failed to create shortcut: $_"
}
