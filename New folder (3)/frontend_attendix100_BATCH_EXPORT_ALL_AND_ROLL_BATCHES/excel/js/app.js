// ============================================================
// ATTENDIX - LOGIN SYSTEM
// js/app.js
// ============================================================


// ============================================================
// FIREBASE IMPORTS
// ============================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",
  authDomain: "attendix-rfid-attendance.firebaseapp.com",
  projectId: "attendix-rfid-attendance",
  storageBucket: "attendix-rfid-attendance.firebasestorage.app",
  messagingSenderId: "1038365817716",
  appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
  measurementId: "G-ZYCH6VZHD0"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// GET HTML ELEMENTS
// ============================================================

const loginForm = document.getElementById("loginForm");

const roleSelect = document.getElementById("role");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const loginBtn =
    document.getElementById("loginBtn");

const errorMessage =
    document.getElementById("errorMessage");


// ============================================================
// CHECK ELEMENTS
// ============================================================

if (!loginForm) {
    console.error("ERROR: loginForm not found.");
}

if (!roleSelect) {
    console.error("ERROR: role select not found.");
}

if (!emailInput) {
    console.error("ERROR: email input not found.");
}

if (!passwordInput) {
    console.error("ERROR: password input not found.");
}

if (!loginBtn) {
    console.error("ERROR: login button not found.");
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(message) {

    if (!errorMessage) return;

    errorMessage.textContent = message;

    errorMessage.style.display = "block";
}


// ============================================================
// HIDE ERROR
// ============================================================

function hideError() {

    if (!errorMessage) return;

    errorMessage.textContent = "";

    errorMessage.style.display = "none";
}


// ============================================================
// PASSWORD SHOW / HIDE
// ============================================================

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                togglePassword.textContent = "🙈";

            } else {

                passwordInput.type = "password";

                togglePassword.textContent = "👁";

            }

        }
    );

}


// ============================================================
// FIREBASE AUTH PERSISTENCE
// ============================================================

async function setupPersistence() {

    try {

        await setPersistence(
            auth,
            browserLocalPersistence
        );

        console.log(
            "Firebase persistence enabled."
        );

    } catch (error) {

        console.error(
            "Persistence error:",
            error
        );

    }

}

await setupPersistence();


// ============================================================
// LOGIN FUNCTION
// ============================================================

async function loginUser() {

    hideError();


    // --------------------------------------------------------
    // GET FORM VALUES
    // --------------------------------------------------------

    const selectedRole =
        roleSelect.value.trim().toLowerCase();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!selectedRole) {

        showError(
            "Please select your role."
        );

        return;

    }


    if (!email) {

        showError(
            "Please enter your email."
        );

        return;

    }


    if (!password) {

        showError(
            "Please enter your password."
        );

        return;

    }


    // --------------------------------------------------------
    // LOGIN BUTTON
    // --------------------------------------------------------

    loginBtn.disabled = true;

    loginBtn.textContent = "Signing in...";


    try {

        console.log(
            "Attempting Firebase login..."
        );


        // ====================================================
        // FIREBASE AUTH LOGIN
        // ====================================================

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        console.log(
            "Firebase login successful."
        );

        console.log(
            "UID:",
            user.uid
        );


        // ====================================================
        // GET USER DOCUMENT
        // ====================================================

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnapshot =
            await getDoc(userRef);


        // ====================================================
        // CHECK USER DOCUMENT
        // ====================================================

        if (!userSnapshot.exists()) {

            throw new Error(
                "User profile not found in Firestore."
            );

        }


        const userData =
            userSnapshot.data();


        console.log(
            "Firestore user data:",
            userData
        );


        // ====================================================
        // GET FIRESTORE ROLE
        // ====================================================

        const firestoreRole =
            String(
                userData.role || ""
            )
            .trim()
            .toLowerCase();


        if (!firestoreRole) {

            throw new Error(
                "No role is assigned to this account."
            );

        }


        console.log(
            "Selected role:",
            selectedRole
        );

        console.log(
            "Firestore role:",
            firestoreRole
        );


        // ====================================================
        // CHECK ROLE
        // ====================================================

        if (
            selectedRole !== firestoreRole
        ) {

            throw new Error(
                `Wrong role selected. This account is registered as ${firestoreRole}.`
            );

        }


        // ====================================================
        // ADMIN
        // ====================================================

        if (
            firestoreRole === "admin"
        ) {

            console.log(
                "Admin login successful."
            );


            window.location.href =
                "pages/admin.html";


            return;

        }


        // ====================================================
        // TEACHER
        // ====================================================

        if (
            firestoreRole === "teacher"
        ) {

            console.log(
                "Teacher login successful."
            );


            window.location.href =
                "pages/teacher.html";


            return;

        }


        // ====================================================
        // STUDENT
        // ====================================================

        if (
            firestoreRole === "student"
        ) {


            // ------------------------------------------------
            // CHECK STUDENT ID
            // ------------------------------------------------

            if (!userData.student_id) {

                throw new Error(
                    "Student ID is missing from your user profile."
                );

            }


            console.log(
                "Student ID:",
                userData.student_id
            );


            console.log(
                "Student login successful."
            );


            // ------------------------------------------------
            // STUDENT DASHBOARD
            // ------------------------------------------------

            window.location.href =
                "pages/student-dashboard.html";


            return;

        }


        // ====================================================
        // INVALID ROLE
        // ====================================================

        throw new Error(
            "Invalid role assigned to this account."
        );


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        // ====================================================
        // FIREBASE ERROR HANDLING
        // ====================================================

        let message =
            "Login failed. Please try again.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid email or password.";

        }


        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }


        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No account found with this email.";

        }


        else if (
            error.code ===
            "auth/wrong-password"
        ) {

            message =
                "Incorrect password.";

        }


        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many login attempts. Please try again later.";

        }


        else if (
            error.code ===
            "auth/network-request-failed"
        ) {

            message =
                "Network error. Please check your internet connection.";

        }


        else if (
            error.code ===
            "auth/api-key-not-valid"
        ) {

            message =
                "Firebase API key is not valid. Please check the Firebase Web App configuration.";

        }


        else if (
            error.code ===
            "auth/operation-not-allowed"
        ) {

            message =
                "Email/Password authentication is not enabled in Firebase.";

        }


        else if (error.message) {

            message =
                error.message;

        }


        showError(message);


        // ====================================================
        // RESET BUTTON
        // ====================================================

        loginBtn.disabled = false;

        loginBtn.textContent = "Login";

    }

}


// ============================================================
// LOGIN FORM SUBMIT
// ============================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await loginUser();

        }
    );

}


// ============================================================
// DEBUG MESSAGE
// ============================================================

console.log(
    "ATTENDIX Login System Loaded Successfully."
);

console.log(
    "Firebase Project:",
    firebaseConfig.projectId
);