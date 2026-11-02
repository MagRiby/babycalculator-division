// === Firebase Configuration (Optional) ===
// Works out of the box with localStorage!
// To sync across devices:
// 1. Go to https://console.firebase.google.com/
// 2. Create a Realtime Database in TEST MODE
// 3. Replace the placeholder values below with your project's firebaseConfig

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let firebaseDB = null;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        firebaseDB = firebase.database();
        console.log('Firebase connected');
    } else {
        console.log('Firebase not configured — using localStorage only');
    }
} catch (e) {
    console.warn('Firebase init failed:', e);
}
