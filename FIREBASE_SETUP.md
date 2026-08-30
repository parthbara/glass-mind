# 🔥 Firebase Setup Guide for Glass Mind

Follow these steps to create your backend for syncing device data.

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it `glass-mind` (or similar).
4. Disable Google Analytics (not needed for this).
5. Click **"Create project"**.

### 2. Setup Realtime Database
1. In the left sidebar, click **Build** -> **Realtime Database**.
2. Click **"Create Database"**.
3. Choose a location (e.g., United States).
4. **Security Rules**: Choose **"Start in locked mode"**.
   * Do **not** use test mode. Test mode leaves the database world-readable and
     world-writable for 30 days, and it fails open again once the window lapses --
     anyone who learns the URL can read your device history and location, or write
     to it. The URL is not a secret: it ships in the client bundle.
   * Then set rules that suit how you run it. The simplest safe option, if you only
     ever write from your own scripts and read from your own browser, is to require
     Firebase Auth:

     ```json
     {
       "rules": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
     ```

   * If you want the dashboard publicly readable but not writable, use
     `".read": true` with `".write": "auth != null"` -- and be aware that this
     publishes your device activity and coordinates to anyone with the URL.

### 3. Get Configuration Keys
1. Click the **Project Settings** (gear icon ⚙️ next to "Project Overview" in the top left).
2. Scroll down to "Your apps".
3. Click the **Web** icon (`</>`).
4. Register app with nickname "Glass Mind Web".
5. Copy the `firebaseConfig` object (apiKey, authDomain, etc.).

### 4. Connect to Code
1. Copy `.env.example` to `.env` (it is gitignored -- never commit it).
2. Fill in the `VITE_FIREBASE_*` values from the `firebaseConfig` object you just
   copied, plus `VITE_GEMINI_API_KEY` if you want the AI chat.
3. `src/firebase.js` reads these at build time. Leave the file alone.

> With no `VITE_FIREBASE_API_KEY` set, the app runs in demo mode against local
> seed data and makes no network calls at all.

### 5. Get Database URL for Scripts
1. Go back to **Realtime Database** in the console.
2. Copy the URL at the top of the data panel (e.g., `https://YOUR-PROJECT.firebasedatabase.app/`).
3. You will use this URL in your Android `glass-reporter.sh` and PC `watcher.ps1` scripts.

---

## 🚀 Deployment (Netlify Drop)

Since Git is not available in this terminal:

1. **Build Your Project**:
   Run this command in your terminal:
   ```bash
   npm run build
   ```
   *(This creates a `dist` folder with your production website)*

2. **Deploy Manually**:
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop).
   - Drag and drop the **`dist`** folder from your project directory into the Netlify window.
   - Your site will be instantly live! 🌍

3. **Update Scripts**:
   - Once live, you can get your public URL (e.g., `https://your-deployed-site.netlify.app`).
   - You can install this on your phone as a PWA!

