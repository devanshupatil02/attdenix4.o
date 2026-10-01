
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Copy your existing Firebase configuration here
const firebaseConfig = {
  apiKey: "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",
  authDomain: "attendix-rfid-attendance.firebaseapp.com",
  projectId: "attendix-rfid-attendance",
  storageBucket: "attendix-rfid-attendance.firebasestorage.app",
  messagingSenderId: "1038365817716",
  appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
  measurementId: "G-ZYCH6VZHD0"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };