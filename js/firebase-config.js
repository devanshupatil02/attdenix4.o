import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_TdTQuNJg-nD7UR-ZGgwdZMUFvjo28H0",
  authDomain: "attendix-44aea.firebaseapp.com",
  projectId: "attendix-44aea",
  storageBucket: "attendix-44aea.firebasestorage.app",
  messagingSenderId: "680738019735",
  appId: "1:680738019735:web:d8fd1a023223434bd6ccd2",
  measurementId: "G-JZVMR7E7YN"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
