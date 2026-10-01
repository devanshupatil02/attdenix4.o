// ============================================================
// ATTENDIX - STUDENT DASHBOARD
// ============================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAxVUihj9BhmR_0uyXJyQmD00eQ9mgq9M",
    authDomain: "attendix-rfid-attendance.firebaseapp.com",
    projectId: "attendix-rfid-attendance",
    storageBucket: "attendix-rfid-attendance.firebasestorage.app",
    messagingSenderId: "1038365817716",
    appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
    measurementId: "G-ZYCH6VZHD0"
};


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// DOM ELEMENTS
// ============================================================

const userAvatar =
    document.getElementById("userAvatar");

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const welcomeName =
    document.getElementById("welcomeName");

const studentInfo =
    document.getElementById("studentInfo");

const currentDate =
    document.getElementById("currentDate");

const overallAttendance =
    document.getElementById("overallAttendance");

const presentCount =
    document.getElementById("presentCount");

const absentCount =
    document.getElementById("absentCount");

const totalClasses =
    document.getElementById("totalClasses");

const todayClassesBody =
    document.getElementById("todayClassesBody");

const subjectAttendanceBody =
    document.getElementById("subjectAttendanceBody");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================================
// HELPER - INITIALS
// ============================================================

function getInitials(name) {

    if (!name) {
        return "S";
    }

    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();
}


// ============================================================
// HELPER - HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// HELPER - DATE
// ============================================================

function updateDate() {

    if (!currentDate) {
        return;
    }

    const today =
        new Date();

    currentDate.textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
}


// ============================================================
// HELPER - TIME
// ============================================================

function formatTime(time) {

    if (!time) {
        return "-";
    }

    const parts =
        String(time).split(":");

    if (parts.length < 2) {
        return time;
    }

    let hour =
        Number(parts[0]);

    const minute =
        parts[1];

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                console.log(
                    "Student logged out."
                );

                window.location.replace(
                    "../index.html"
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );
}


// ============================================================
// GET STUDENT PROFILE
// ============================================================

async function getStudentProfile(user) {

    console.log(
        "Getting user profile..."
    );


    // --------------------------------------------------------
    // users/{uid}
    // --------------------------------------------------------

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );

    const userSnapshot =
        await getDoc(userRef);


    if (!userSnapshot.exists()) {

        throw new Error(
            "User profile not found in users collection."
        );
    }


    const userData =
        userSnapshot.data();


    console.log(
        "User document:",
        userData
    );


    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    const role =
        String(
            userData.role || ""
        )
        .trim()
        .toLowerCase();


    if (role !== "student") {

        throw new Error(
            `This account has role "${role}", not student.`
        );
    }


    // --------------------------------------------------------
    // STUDENT ID
    // --------------------------------------------------------

    const studentId =
        String(
            userData.student_id || ""
        ).trim();


    if (!studentId) {

        throw new Error(
            "student_id is missing from users document."
        );
    }


    console.log(
        "Student ID:",
        studentId
    );


    // --------------------------------------------------------
    // students/{student_id}
    // --------------------------------------------------------

    const studentRef =
        doc(
            db,
            "students",
            studentId
        );

    const studentSnapshot =
        await getDoc(studentRef);


    if (!studentSnapshot.exists()) {

        throw new Error(
            `Student document not found: ${studentId}`
        );
    }


    const studentData =
        studentSnapshot.data();


    console.log(
        "Student document:",
        studentData
    );


    return {

        user: userData,

        student: studentData,

        studentId: studentId

    };
}


// ============================================================
// UPDATE STUDENT HEADER
// ============================================================

function updateStudentHeader(
    userData,
    studentData
) {

    const name =
        studentData.name ||
        userData.name ||
        "Student";


    const department =
        studentData.department ||
        "AI and Data Science";


    const studentClass =
        studentData.class ||
        "-";


    const rollNo =
        studentData.roll_no ||
        "-";


    // --------------------------------------------------------
    // TOP USER
    // --------------------------------------------------------

    if (userName) {

        userName.textContent =
            name;
    }


    if (userRole) {

        userRole.textContent =
            "Student";
    }


    if (userAvatar) {

        userAvatar.textContent =
            getInitials(name);
    }


    // --------------------------------------------------------
    // WELCOME
    // --------------------------------------------------------

    if (welcomeName) {

        welcomeName.textContent =
            name;
    }


    if (studentInfo) {

        studentInfo.textContent =
            `${studentClass} • ${department} • Roll No: ${rollNo}`;
    }


    updateDate();
}


// ============================================================
// LOAD SUBJECTS
// ============================================================

async function loadSubjects() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "subjects"
            )
        );


    const subjectMap = {};


    snapshot.forEach(
        subjectDoc => {

            const data =
                subjectDoc.data();


            subjectMap[
                subjectDoc.id
            ] =
                data.name ||
                subjectDoc.id;

        }
    );


    return subjectMap;
}


// ============================================================
// LOAD STUDENT ATTENDANCE
// ============================================================

async function loadStudentAttendance(
    studentId
) {

    console.log(
        "Loading attendance for:",
        studentId
    );


    /*
     * IMPORTANT:
     *
     * We query only this student's records.
     *
     * This matches the Firestore security rule:
     *
     * resource.data.student_id == getStudentId()
     */

    const attendanceQuery =
        query(
            collection(
                db,
                "attendance"
            ),
            where(
                "student_id",
                "==",
                studentId
            )
        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    const records = [];


    snapshot.forEach(
        attendanceDoc => {

            records.push({

                id:
                    attendanceDoc.id,

                ...attendanceDoc.data()

            });

        }
    );


    console.log(
        "Student attendance:",
        records
    );


    return records;
}


// ============================================================
// LOAD TIMETABLE
// ============================================================

async function loadTimetable() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "timetable"
            )
        );


    const timetable = [];


    snapshot.forEach(
        timetableDoc => {

            const data =
                timetableDoc.data();


            if (
                data.active === false
            ) {
                return;
            }


            timetable.push({

                id:
                    timetableDoc.id,

                ...data

            });

        }
    );


    console.log(
        "Timetable:",
        timetable
    );


    return timetable;
}


// ============================================================
// TODAY'S CLASSES
// ============================================================

function renderTodayClasses(
    timetable,
    subjectMap
) {

    if (!todayClassesBody) {
        return;
    }


    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];


    const today =
        days[
            new Date().getDay()
        ];


    console.log(
        "Today:",
        today
    );


    const todayClasses =
        timetable.filter(
            item =>
                String(
                    item.day || ""
                )
                .trim()
                .toLowerCase() ===
                today.toLowerCase()
        );


    todayClasses.sort(
        (a, b) =>
            String(
                a.startTime || ""
            ).localeCompare(
                String(
                    b.startTime || ""
                )
            )
    );


    todayClassesBody.innerHTML = "";


    if (
        todayClasses.length === 0
    ) {

        todayClassesBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state"
                >

                    No classes scheduled for today.

                </td>

            </tr>

        `;

        return;
    }


    todayClasses.forEach(
        classData => {

            const subjectName =
                subjectMap[
                    classData.subjectID
                ] ||
                classData.subjectID ||
                "Unknown Subject";


            todayClassesBody.innerHTML += `

                <tr>

                    <td>

                        ${escapeHTML(
                            formatTime(
                                classData.startTime
                            )
                        )}

                        -

                        ${escapeHTML(
                            formatTime(
                                classData.endTime
                            )
                        )}

                    </td>


                    <td>

                        <strong>

                            ${escapeHTML(
                                subjectName
                            )}

                        </strong>

                    </td>


                    <td>

                        ${escapeHTML(
                            classData.type ||
                            "-"
                        )}

                    </td>


                    <td>

                        ${escapeHTML(
                            classData.room ||
                            "-"
                        )}

                    </td>


                    <td>

                        <span
                            class="status-badge status-upcoming"
                        >

                            Scheduled

                        </span>

                    </td>

                </tr>

            `;

        }
    );
}


// ============================================================
// ATTENDANCE DASHBOARD
// ============================================================

function renderAttendance(
    records,
    timetable,
    subjectMap
) {

    // --------------------------------------------------------
    // PRESENT
    // --------------------------------------------------------

    const present =
        records.length;


    /*
     * Current ATTENDIX attendance collection stores
     * successful RFID scans.
     *
     * Therefore every record represents PRESENT.
     *
     * We do not invent absent records.
     */


    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    /*
     * For now, total recorded classes = attendance records.
     *
     * Full scheduled-class calculation can be added when
     * date-wise timetable expansion is required.
     */

    const total =
        present;


    const absent =
        0;


    const percentage =
        total > 0
            ? Math.round(
                (
                    present /
                    total
                ) * 100
            )
            : 0;


    // --------------------------------------------------------
    // STATS
    // --------------------------------------------------------

    if (overallAttendance) {

        overallAttendance.textContent =
            `${percentage}%`;
    }


    if (presentCount) {

        presentCount.textContent =
            present;
    }


    if (absentCount) {

        absentCount.textContent =
            absent;
    }


    if (totalClasses) {

        totalClasses.textContent =
            total;
    }


    // --------------------------------------------------------
    // SUBJECT-WISE
    // --------------------------------------------------------

    if (!subjectAttendanceBody) {
        return;
    }


    const subjectData = {};


    records.forEach(
        record => {

            const subjectId =
                String(
                    record.subject_id ||
                    "unknown"
                );


            if (!subjectData[subjectId]) {

                subjectData[subjectId] = {

                    present: 0

                };

            }


            subjectData[
                subjectId
            ].present++;

        }
    );


    const subjectIds =
        Object.keys(subjectData);


    subjectAttendanceBody.innerHTML = "";


    if (
        subjectIds.length === 0
    ) {

        subjectAttendanceBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state"
                >

                    No attendance data available.

                </td>

            </tr>

        `;

        return;
    }


    subjectIds.forEach(
        subjectId => {

            const data =
                subjectData[
                    subjectId
                ];


            const subjectPresent =
                data.present;


            const subjectTotal =
                subjectPresent;


            const subjectAbsent =
                0;


            const subjectPercentage =
                subjectTotal > 0
                    ? Math.round(
                        (
                            subjectPresent /
                            subjectTotal
                        ) * 100
                    )
                    : 0;


            const subjectName =
                subjectMap[
                    subjectId
                ] ||
                subjectId;


            const statusClass =
                subjectPercentage >= 75
                    ? "good"
                    : "low";


            subjectAttendanceBody.innerHTML += `

                <tr>

                    <td>

                        <strong>

                            ${escapeHTML(
                                subjectName
                            )}

                        </strong>

                    </td>


                    <td>

                        ${subjectPresent}

                    </td>


                    <td>

                        ${subjectAbsent}

                    </td>


                    <td>

                        ${subjectTotal}

                    </td>


                    <td>

                        <span
                            class="percentage ${statusClass}"
                        >

                            ${subjectPercentage}%

                        </span>

                    </td>

                </tr>

            `;

        }
    );
}


// ============================================================
// MAIN DASHBOARD LOADER
// ============================================================

async function loadStudentDashboard(
    user
) {

    console.log(
        "========================================"
    );

    console.log(
        "ATTENDIX STUDENT DASHBOARD"
    );

    console.log(
        "Email:",
        user.email
    );

    console.log(
        "UID:",
        user.uid
    );

    console.log(
        "========================================"
    );


    // --------------------------------------------------------
    // GET STUDENT PROFILE
    // --------------------------------------------------------

    const profile =
        await getStudentProfile(
            user
        );


    // --------------------------------------------------------
    // UPDATE HEADER
    // --------------------------------------------------------

    updateStudentHeader(
        profile.user,
        profile.student
    );


    // --------------------------------------------------------
    // LOAD DATA
    // --------------------------------------------------------

    const [
        subjects,
        attendance,
        timetable
    ] =
        await Promise.all([
            loadSubjects(),
            loadStudentAttendance(
                profile.studentId
            ),
            loadTimetable()
        ]);


    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    renderAttendance(
        attendance,
        timetable,
        subjects
    );


    renderTodayClasses(
        timetable,
        subjects
    );


    console.log(
        "========================================"
    );

    console.log(
        "✅ STUDENT DASHBOARD LOADED"
    );

    console.log(
        "========================================"
    );
}


// ============================================================
// AUTH STATE
// ============================================================

console.log(
    "🔥 student-dashboard.js loaded"
);


onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "========================================"
        );

        console.log(
            "STUDENT AUTH STATE"
        );

        console.log(
            "User:",
            user
        );


        if (user) {

            console.log(
                "Email:",
                user.email
            );

            console.log(
                "UID:",
                user.uid
            );

        } else {

            console.log(
                "User: NO USER YET"
            );

        }

        console.log(
            "========================================"
        );


        // ====================================================
        // USER NOT READY
        // ====================================================

        if (!user) {

            /*
             * DO NOT REDIRECT HERE.
             *
             * Firebase can still be initializing.
             *
             * This prevents the student from being
             * incorrectly kicked back to login.
             */

            console.log(
                "⏳ Waiting for Firebase authentication..."
            );

            return;
        }


        // ====================================================
        // USER FOUND
        // ====================================================

        try {

            console.log(
                "✅ Firebase student session found."
            );


            await loadStudentDashboard(
                user
            );


        } catch (error) {

            console.error(
                "❌ STUDENT DASHBOARD ERROR:",
                error
            );


            // ------------------------------------------------
            // SHOW ERROR ON PAGE
            // ------------------------------------------------

            if (todayClassesBody) {

                todayClassesBody.innerHTML = `

                    <tr>

                        <td
                            colspan="5"
                            class="empty-state"
                        >

                            Unable to load student dashboard.

                            <br><br>

                            ${escapeHTML(
                                error.message
                            )}

                        </td>

                    </tr>

                `;

            }


            if (subjectAttendanceBody) {

                subjectAttendanceBody.innerHTML = `

                    <tr>

                        <td
                            colspan="5"
                            class="empty-state"
                        >

                            Unable to load attendance.

                            <br><br>

                            ${escapeHTML(
                                error.message
                            )}

                        </td>

                    </tr>

                `;

            }

        }

    }
);