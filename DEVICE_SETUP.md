# Glass Mind - Mobile & Daemon Setup Guide

## 📱 Android Phone Integration

You have two options to connect your Android phone. **MacroDroid is recommended** as it is easier and works reliably on all Android versions without Termux complexity.

### Option A: MacroDroid (Recommended - Easier)
**Perfect for custom ROMs and standard Android.**

1. Install **MacroDroid** from Play Store.
2. Create a new Macro.
3. **Add Triggers** (Red section):
   - Tap `+`, select **Battery/Power** -> **Battery Level Change** -> Update every 1%.
   - Tap `+` again, select **Macro/Instrument** -> **Interval** -> Every 5 minutes (for location updates).
   - *(You will have two triggers listed now. The macro runs if ANY of them happen)*.
4. **Add Actions** (Blue section):
   - **(Optional but Recommended for Accuracy)**: Tap `+`, search **Force Location Update**. Select **Google Location Services** (High Accuracy).
   - Tap `+`, search for **HTTP Request**.
   - **URL**: `https://YOUR-PROJECT-default-rtdb.YOUR-REGION.firebasedatabase.app/devices/phone-android.json`
   - **Method**: `PATCH`
   - **Content Type**: `application/json`
   - **Body**:
     ```json
     {"type":"phone","name":"My Phone","battery":"[battery]","location":{"lat":"[last_known_location_lat]","lng":"[last_known_location_long]"},"lastSeen":"[system_time_ms]"}
     ```
   - **CRITICAL**: You must manually delete the text `[battery]` (and others) and use the `...` button to select the blue variables.
   - If you send the text `[battery]`, the website sees "0%".
   - If you send the text `[last_known...]`, the map breaks.
   - **You must use the blue magic variables!**
5. Save the macro as "Glass Mind Reporter".
6. **Test it!** Right-click the macro and "Test Actions".
   - If you get `200 OK`, we can add location later.
   - If you still get `400`, check the **Content Type** header is `application/json`.

---

### Option B: Termux (Advanced)
**Use this if you prefer a command-line approach.**

1. Install **Termux** and **Termux:API** from **F-Droid** (Play Store version is outdated).
2. Open Termux and run:
   ```bash
   pkg update
   pkg install termux-api jq curl
   ```
3. Create `glass-reporter.sh`:
   ```bash
   #!/bin/bash
   FIREBASE_URL="https://YOUR-PROJECT-default-rtdb.firebaseio.com/devices/phone-android.json"
   
   while true; do
       BATTERY_INFO=$(termux-battery-status)
       BATTERY_LEVEL=$(echo $BATTERY_INFO | jq '.percentage')
       IS_CHARGING=$(echo $BATTERY_INFO | jq '.plugged != "UNPLUGGED"')
       
       LOCATION_INFO=$(termux-location -p network -r 1)
       LAT=$(echo $LOCATION_INFO | jq '.latitude')
       LNG=$(echo $LOCATION_INFO | jq '.longitude')
       
       JSON_DATA=$(jq -n \
                     --arg batt "$BATTERY_LEVEL" \
                     --argjson charging "$IS_CHARGING" \
                     --arg lat "$LAT" \
                     --arg lng "$LNG" \
                     '{battery: $batt, isCharging: $charging, location: {lat: $lat, lng: $lng}, lastSeen: (now | todate)}')
   
       curl -X PATCH -d "$JSON_DATA" "$FIREBASE_URL"
       sleep 60
   done
   ```
4. run: `chmod +x glass-reporter.sh && ./glass-reporter.sh`

---

## 🖥️ PC Daemon (Watcher) - Auto-Start Setup

To track your active window and "focus mode" on your PC automatically.

### 1. Setup Auto-Start (Windows)
We have included a script to make this easy.

1. Open PowerShell as Administrator.
2. Navigate to this folder.
3. Run:
   ```powershell
   ./setup-autostart.ps1
   ```
4. This will register a scheduled task that runs `watcher.ps1` hidden in the background whenever you log in.

### 2. Manual Run
If you want to run it immediately without restarting:
```powershell
./watcher.ps1
```

### 3. Work PC Setup
Simply copy the `watcher.ps1` and `setup-autostart.ps1` to your work PC and run `setup-autostart.ps1`.
Ensure `watcher.ps1` has the ID changed to `laptop-work` usually (edit line 1 of watcher.ps1):
```powershell
$FirebaseUrl = "https://YOUR-PROJECT-default-rtdb.firebaseio.com/devices/laptop-work.json"
```

## 🚀 Deployment
1. **Commit your code** to GitHub.
2. **Connect to Netlify**.
3. **Build Command**: `npm run build`
4. **Publish Directory**: `dist`

