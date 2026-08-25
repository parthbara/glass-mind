Add-Type -AssemblyName System.Windows.Forms
$FirebaseUrl = "https://glass-mind-d1aaa-default-rtdb.asia-southeast1.firebasedatabase.app/devices/desktop-main.json"

# Show dialog
$result = [System.Windows.Forms.MessageBox]::Show("Start Glass Mind Watcher for this session?", "Glass Mind", "YesNo", "Question")

if ($result -eq 'Yes') {
    $scriptPath = Join-Path $PSScriptRoot "watcher.ps1"
    # Start the watcher hidden
    Start-Process powershell -ArgumentList "-WindowStyle Hidden", "-ExecutionPolicy Bypass", "-File `"$scriptPath`"" -WindowStyle Hidden
} else {
    # User said No (or closed). 
    # CRITICAL: Stop any existing watcher instances so they don't override the offline status immediately.
    Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like "*watcher.ps1*" } | ForEach-Object { 
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
    }

    # Mark as offline immediately
    try {
        Invoke-RestMethod -Uri $FirebaseUrl -Method Patch -Body (@{ online = $false } | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
    } catch { }
}
