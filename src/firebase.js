// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push } from "firebase/database";

// Config comes from environment variables -- see .env.example.
// Set real values in a local .env file (gitignored, never commit it).
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Hook to sync devices
export const syncDevices = (callback) => {
    const devicesRef = ref(db, 'devices');
    return onValue(devicesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const devicesArray = Array.isArray(data)
                ? data
                : Object.keys(data).map(key => ({ ...data[key], id: key }));
            callback(devicesArray);
        }
    });
};

// Function to update a device (useful for testing or manual updates)
export const updateDeviceStatus = (deviceId, data) => {
    set(ref(db, 'devices/' + deviceId), data);
};

// Hook to sync nodes
export const syncNodes = (callback) => {
    const nodesRef = ref(db, 'nodes');
    return onValue(nodesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const nodesArray = Array.isArray(data) ? data : Object.values(data);
            callback(nodesArray);
        }
    });
};

// Function to save nodes
export const saveNodes = (nodes) => {
    set(ref(db, 'nodes'), nodes);
};

// Hook to sync chat messages
export const syncMessages = (callback) => {
    const messagesRef = ref(db, 'messages');
    return onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const messagesArray = Object.values(data);
            callback(messagesArray);
        } else {
            callback([]);
        }
    });
};

// Function to send a message
export const sendMessage = (message) => {
    push(ref(db, 'messages'), message);
};
