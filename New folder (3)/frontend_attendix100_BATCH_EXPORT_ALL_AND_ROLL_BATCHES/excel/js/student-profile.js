// ============================================
// ATTENDIX - STUDENT PROFILE
// ============================================


// ============================================
// FIREBASE
// ============================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================
// CONFIG
// ============================================

const firebaseConfig = {

    apiKey:
        "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",

    authDomain:
        "attendix-rfid-attendance.firebaseapp.com",

    projectId:
        "attendix-rfid-attendance",

    storageBucket:
        "attendix-rfid-attendance.firebasestorage.app",

    messagingSenderId:
        "1038365817716",

    appId:
        "1:1038365817716:web:a1160a5265dfb417da8a21",

    measurementId:
        "G-ZYCH6VZHD0"
};


// ============================================
// INITIALIZE
// ============================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


// ============================================
// DOM
// ============================================

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const largeAvatar =
    document.getElementById("largeAvatar");

const profileName =
    document.getElementById("profileName");

const profileClass =
    document.getElementById("profileClass");

const profileGrid =
    document.getElementById("profileGrid");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================
// START
// ============================================

async function startPage() {

    try {

        await setPersistence(
            auth,
            browserLocalPersistence
        );

    } catch (error) {

        console.error(
            "Persistence error:",
            error
        );
    }


    onAuthStateChanged(
        auth,
        async (user) => {

            if (!user) {

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            try {

                await loadProfile(user);

            } catch (error) {

                console.error(
                    "Profile Error:",
                    error
                );

                showError(
                    "Unable to load profile."
                );
            }

        }
    );
}


startPage();


// ============================================
// LOAD PROFILE
// ============================================

async function loadProfile(user) {

    // ----------------------------------------
    // USER DOCUMENT
    // ----------------------------------------

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );


    const userSnapshot =
        await getDoc(userRef);


    if (!userSnapshot.exists()) {

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    const userData =
        userSnapshot.data();


    // ----------------------------------------
    // CHECK ROLE
    // ----------------------------------------

    const role =
        String(
            userData.role || ""
        )
            .trim()
            .toLowerCase();


    if (role !== "student") {

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    // ----------------------------------------
    // STUDENT ID
    // ----------------------------------------

    const studentId =
        userData.student_id;


    if (!studentId) {

        showError(
            "Student profile is not linked."
        );

        return;
    }


    // ----------------------------------------
    // STUDENT DOCUMENT
    // ----------------------------------------

    const studentRef =
        doc(
            db,
            "students",
            studentId
        );


    const studentSnapshot =
        await getDoc(studentRef);


    if (!studentSnapshot.exists()) {

        showError(
            "Student profile not found."
        );

        return;
    }


    const studentData =
        studentSnapshot.data();


    renderProfile(
        studentData,
        userData
    );
}


// ============================================
// RENDER PROFILE
// ============================================

function renderProfile(
    student,
    user
) {

    const name =
        student.name ||
        user.name ||
        "Student";


    const department =
        student.department ||
        "-";


    const studentClass =
        student.class ||
        "-";


    const rollNo =
        student.roll_no ||
        "-";


    const email =
        student.email ||
        user.email ||
        "-";


    const rfid =
        student.rfid_uid ||
        "-";


    const active =
        student.active === false
            ? "Inactive"
            : "Active";


    // ----------------------------------------
    // TOP USER
    // ----------------------------------------

    if (userName) {

        userName.textContent =
            name;
    }


    if (userRole) {

        userRole.textContent =
            "Student";
    }


    // ----------------------------------------
    // AVATAR
    // ----------------------------------------

    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase();


    if (userAvatar) {

        userAvatar.textContent =
            initial;
    }


    if (largeAvatar) {

        largeAvatar.textContent =
            initial;
    }


    // ----------------------------------------
    // PROFILE HEADER
    // ----------------------------------------

    if (profileName) {

        profileName.textContent =
            name;
    }


    if (profileClass) {

        profileClass.textContent =
            `${department} • ${studentClass}`;
    }


    // ----------------------------------------
    // PROFILE FIELDS
    // ----------------------------------------

    if (profileGrid) {

        profileGrid.innerHTML = `

            <div class="profile-field">

                <label>
                    Full Name
                </label>

                <strong>
                    ${escapeHTML(name)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    Roll Number
                </label>

                <strong>
                    ${escapeHTML(rollNo)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    Email
                </label>

                <strong>
                    ${escapeHTML(email)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    Department
                </label>

                <strong>
                    ${escapeHTML(department)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    Class
                </label>

                <strong>
                    ${escapeHTML(studentClass)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    RFID UID
                </label>

                <strong>
                    ${escapeHTML(rfid)}
                </strong>

            </div>


            <div class="profile-field">

                <label>
                    Account Status
                </label>

                <strong>
                    ${escapeHTML(active)}
                </strong>

            </div>

        `;
    }
}


// ============================================
// HTML ESCAPE
// ============================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================
// ERROR
// ============================================

function showError(message) {

    if (profileGrid) {

        profileGrid.innerHTML = `

            <div class="loading-profile">

                ${escapeHTML(message)}

            </div>

        `;
    }
}


// ============================================
// LOGOUT
// ============================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                window.location.replace(
                    "../index.html"
                );

            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

            }
        }
    );
}