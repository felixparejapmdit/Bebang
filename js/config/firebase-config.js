/* ============================================================
   Firebase project config (shared live sync across every device that signs in).
   These values come from Firebase Console > Project Settings > General > "Your apps".
   They are NOT secrets — access is enforced by Firestore Security Rules (see PLAN.md),
   not by hiding this config. Put "YOUR_..." placeholders back to run local-only.
   ============================================================ */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAD33uqXetVeDebYJLq_6O4d2hQTIovGr4",
    authDomain: "bebang-ecbce.firebaseapp.com",
    projectId: "bebang-ecbce",
    storageBucket: "bebang-ecbce.firebasestorage.app",
    messagingSenderId: "1543783955",
    appId: "1:1543783955:web:49509fa161491da6a121e6"
};

// Local IndexedDB names (unchanged from the single-file version so existing data carries over).
const STORE_NAME = 'BebangBizSystem_v1';
const DATA_KEY = 'beb_biz_data_v1';
const DB_VERSION = 1;
