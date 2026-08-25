# Glass Mind - PC Watcher Script
# Reports active window, CPU, RAM, and activity status to Firebase Realtime Database

$FirebaseUrl = "https://glass-mind-d1aaa-default-rtdb.asia-southeast1.firebasedatabase.app/devices/desktop-main.json"
$IntervalSeconds = 10

# --- Helper: Get foreground window title ---
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function Get-ActiveWindowTitle {
    $hwnd = [WinAPI]::GetForegroundWindow()
    $sb = New-Object System.Text.StringBuilder 256
    [WinAPI]::GetWindowText($hwnd, $sb, 256) | Out-Null
    return $sb.ToString()
}

function Get-ActiveProcessName {
    try {
        $hwnd = [WinAPI]::GetForegroundWindow()
        $procId = [uint32]0
        [WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
        if ($procId -gt 0) {
            return (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        }
    }
    catch {}
    return ""
}

function Get-VisibleWindowCount {
    return @(Get-Process | Where-Object { $_.MainWindowTitle -ne "" }).Count
}

function Get-CpuUsage {
    try {
        $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        return [math]::Round($cpu)
    }
    catch { return 0 }
}

function Get-MemoryUsage {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $used = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
        return [math]::Round(($used / $os.TotalVisibleMemorySize) * 100)
    }
    catch { return 0 }
}

function Get-ActivityStatus {
    param([string]$windowTitle, [string]$processName)
    
    $title = $windowTitle.ToLower()
    $proc = $processName.ToLower()

    # Coding
    if ($proc -match "code|devenv|idea|webstorm|pycharm|rider|sublime|notepad\+\+|cursor") { return "coding" }
    if ($title -match "visual studio") { return "coding" }

    # Music
    if ($proc -match "spotify|musicbee|foobar|vlc|itunes|winamp") { return "music" }
    if ($title -match "spotify|youtube music") { return "music" }

    # Gaming (generic)
    if ($proc -match "steam|epicgames|riot|league|minecraft|csgo|cs2|dota|overwatch|apex|fortnite|genshin") { return "gaming" }

    # Communication
    if ($proc -match "discord|teams|slack|zoom|telegram|whatsapp|signal|skype") { return "communicating" }

    # Browsing
    if ($proc -match "chrome|firefox|msedge|brave|opera|safari") { return "browsing" }

    # Default
    if ($windowTitle -eq "") { return "idle" }
    return "working"
}

function Send-Update {
    param([hashtable]$data)
    try {
        $json = $data | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri $FirebaseUrl -Method Patch -Body $json -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
        # Silently fail - will retry next cycle
    }
}

function Set-Offline {
    try {
        $offlineData = @{
            online   = $false
            lastSeen = [string](Get-Date -UFormat %s).Split('.')[0] + "000"
        }
        $json = $offlineData | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri $FirebaseUrl -Method Patch -Body $json -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
    }
    catch {}
}

# --- Register cleanup on exit ---
Register-EngineEvent PowerShell.Exiting -Action { Set-Offline } | Out-Null

# Trap Ctrl+C
[Console]::TreatControlCAsInput = $false

# --- Main Loop ---
Write-Host "Glass Mind Watcher started. Reporting to Firebase every ${IntervalSeconds}s..."
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        $windowTitle = Get-ActiveWindowTitle
        $processName = Get-ActiveProcessName
        $windowCount = Get-VisibleWindowCount
        $cpu = Get-CpuUsage
        $memory = Get-MemoryUsage
        $status = Get-ActivityStatus -windowTitle $windowTitle -processName $processName
        $timestamp = [string]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())

        $updateData = @{
            online       = $true
            status       = $status
            activeWindow = $windowTitle
            windowCount  = $windowCount
            cpu          = $cpu
            memory       = $memory
            lastSeen     = $timestamp
            type         = "desktop"
            name         = "Home PC"
        }

        Send-Update -data $updateData
        Start-Sleep -Seconds $IntervalSeconds
    }
}
finally {
    Write-Host "`nWatcher stopping... marking offline."
    Set-Offline
}
