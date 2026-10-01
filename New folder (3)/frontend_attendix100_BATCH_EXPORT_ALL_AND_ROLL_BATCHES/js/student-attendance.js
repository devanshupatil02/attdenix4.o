// ============================================
// ATTENDIX - STUDENT ATTENDANCE
// Secure Student-Specific Version
// ============================================


// ============================================
// FIREBASE CORE
// ============================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


// ============================================
// FIREBASE AUTH
// ============================================

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ============================================
// FIREBASE FIRESTORE
// ============================================

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================
// FIREBASE CONFIGURATION
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
// INITIALIZE FIREBASE
// ============================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


// ============================================
// GLOBAL DATA
// ============================================

let currentUser = null;

let currentUserData = null;

let studentData = null;

let subjectsData = [];

let timetableData = [];

let attendanceData = [];


// ============================================
// DOM ELEMENTS
// ============================================

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const welcomeName =
    document.getElementById("welcomeName");

const currentDate =
    document.getElementById("currentDate");

const overallAttendance =
    document.getElementById("overallAttendance");

const totalPresent =
    document.getElementById("totalPresent");

const totalAbsent =
    document.getElementById("totalAbsent");

const totalClasses =
    document.getElementById("totalClasses");

const subjectFilter =
    document.getElementById("subjectFilter");

const subjectAttendanceBody =
    document.getElementById("subjectAttendanceBody");

const attendanceHistoryBody =
    document.getElementById("attendanceHistoryBody");

const logoutBtn =
    document.getElementById("logoutBtn");


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
// DATE HELPERS
// ============================================

function getTodayDate() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatTime(timeString) {

    if (!timeString) {
        return "-";
    }

    const parts =
        String(timeString).split(":");

    if (parts.length < 2) {
        return timeString;
    }

    const hour =
        Number(parts[0]);

    const minute =
        Number(parts[1]);

    const date =
        new Date();

    date.setHours(hour);
    date.setMinutes(minute);

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ============================================
// AUTH START
// ============================================

async function startPage() {

    try {

        await setPersistence(
            auth,
            browserLocalPersistence
        );

    } catch (error) {

        console.error(
            "Auth persistence error:",
            error
        );
    }


    onAuthStateChanged(
        auth,
        async (user) => {

            console.log(
                "Student authentication:",
                user
                    ? user.email
                    : "No user"
            );


            if (!user) {

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            currentUser = user;


            try {

                await loadStudentAttendance();

            } catch (error) {

                console.error(
                    "ATTENDIX Student Attendance Error:",
                    error
                );

                showError(
                    "Unable to load attendance data."
                );
            }
        }
    );
}


startPage();


// ============================================
// LOAD STUDENT ATTENDANCE
// ============================================

async function loadStudentAttendance() {

    // ========================================
    // STEP 1
    // GET LOGGED-IN USER DOCUMENT
    // ========================================

    const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const userSnapshot =
        await getDoc(userRef);


    if (!userSnapshot.exists()) {

        console.error(
            "User profile not found."
        );

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    currentUserData =
        userSnapshot.data();


    // ========================================
    // STEP 2
    // CHECK ROLE
    // ========================================

    const role =
        String(
            currentUserData.role || ""
        )
            .trim()
            .toLowerCase();


    if (role !== "student") {

        console.error(
            "Invalid student role:",
            role
        );

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    // ========================================
    // STEP 3
    // GET STUDENT ID
    // ========================================

    const studentId =
        currentUserData.student_id;


    if (!studentId) {

        console.error(
            "student_id is missing in users document."
        );

        showStudentNotLinked();

        return;
    }


    console.log(
        "Student ID:",
        studentId
    );


    // ========================================
    // STEP 4
    // GET STUDENT PROFILE
    // ========================================

    const studentRef =
        doc(
            db,
            "students",
            studentId
        );


    const studentSnapshot =
        await getDoc(studentRef);


    if (!studentSnapshot.exists()) {

        console.error(
            "Student document not found:",
            studentId
        );

        showStudentNotLinked();

        return;
    }


    studentData = {

        id: studentSnapshot.id,

        ...studentSnapshot.data()

    };


    console.log(
        "Student profile:",
        studentData
    );


    // ========================================
    // STEP 5
    // DISPLAY STUDENT
    // ========================================

    const displayName =
        studentData.name ||
        currentUserData.name ||
        "Student";


    setUserDetails(
        displayName
    );


    if (currentDate) {

        currentDate.textContent =
            formatDate(
                getTodayDate()
            );
    }


    // ========================================
    // STEP 6
    // LOAD SUBJECTS
    // ========================================

    const subjectsSnapshot =
        await getDocs(
            collection(
                db,
                "subjects"
            )
        );


    subjectsData =
        subjectsSnapshot.docs.map(
            document => ({

                id: document.id,

                ...document.data()

            })
        );


    // ========================================
    // STEP 7
    // LOAD TIMETABLE
    // ========================================

    const timetableSnapshot =
        await getDocs(
            collection(
                db,
                "timetable"
            )
        );


    timetableData =
        timetableSnapshot.docs.map(
            document => ({

                id: document.id,

                ...document.data()

            })
        );


    // ========================================
    // STEP 8
    // LOAD ONLY THIS STUDENT'S ATTENDANCE
    // ========================================

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


    const attendanceSnapshot =
        await getDocs(
            attendanceQuery
        );


    attendanceData =
        attendanceSnapshot.docs.map(
            document => ({

                id: document.id,

                ...document.data()

            })
        );


    console.log(
        "Student attendance records:",
        attendanceData.length
    );


    // ========================================
    // STEP 9
    // SUBJECT FILTER
    // ========================================

    populateSubjectFilter();


    // ========================================
    // STEP 10
    // RENDER
    // ========================================

    renderAttendanceSummary();

    renderSubjectAttendance();

    renderAttendanceHistory();
}


// ============================================
// USER DETAILS
// ============================================

function setUserDetails(name) {

    if (userName) {

        userName.textContent =
            name;
    }


    if (welcomeName) {

        welcomeName.textContent =
            name;
    }


    if (userRole) {

        userRole.textContent =
            "Student";
    }


    if (userAvatar) {

        userAvatar.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase();
    }
}


// ============================================
// GET SUBJECT NAME
// ============================================

function getSubjectName(subjectId) {

    const subject =
        subjectsData.find(
            item =>
                String(item.id)
                ===
                String(subjectId)
        );


    if (!subject) {

        return subjectId ||
            "Unknown Subject";
    }


    return subject.name ||
        subject.code ||
        subject.id;
}


// ============================================
// GET SCHEDULED CLASSES
// ============================================

function getScheduledClasses() {

    const scheduled = [];


    // ----------------------------------------
    // Last 180 days
    // ----------------------------------------

    for (
        let i = 0;
        i < 180;
        i++
    ) {

        const date =
            new Date();


        date.setDate(
            date.getDate() - i
        );


        const dayName =
            [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
            ][
                date.getDay()
            ];


        const dateString =
            `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}-${String(
                date.getDate()
            ).padStart(2, "0")}`;


        timetableData.forEach(
            classItem => {

                if (
                    classItem.active === false
                ) {

                    return;
                }


                if (
                    String(
                        classItem.day || ""
                    ).toLowerCase()
                    !==
                    dayName.toLowerCase()
                ) {

                    return;
                }


                scheduled.push({

                    date:
                        dateString,

                    timetableId:
                        classItem.id,

                    subjectID:
                        classItem.subjectID,

                    startTime:
                        classItem.startTime,

                    endTime:
                        classItem.endTime
                });
            }
        );
    }


    return scheduled;
}


// ============================================
// UNIQUE PRESENT SESSIONS
// ============================================

function getUniquePresentSessions() {

    const sessions =
        new Set();


    attendanceData.forEach(
        record => {

            if (
                !record.date ||
                !record.subject_id
            ) {

                return;
            }


            sessions.add(
                `${record.date}_${record.subject_id}`
            );
        }
    );


    return sessions;
}


// ============================================
// SUMMARY
// ============================================

function renderAttendanceSummary() {

    const scheduled =
        getScheduledClasses();


    const presentSessions =
        getUniquePresentSessions();


    const total =
        scheduled.length;


    const present =
        presentSessions.size;


    const absent =
        Math.max(
            total - present,
            0
        );


    const percentage =
        total > 0
            ? Math.round(
                (present / total) * 100
            )
            : 0;


    if (overallAttendance) {

        overallAttendance.textContent =
            `${percentage}%`;
    }


    if (totalPresent) {

        totalPresent.textContent =
            present;
    }


    if (totalAbsent) {

        totalAbsent.textContent =
            absent;
    }


    if (totalClasses) {

        totalClasses.textContent =
            total;
    }
}


// ============================================
// SUBJECT FILTER
// ============================================

function populateSubjectFilter() {

    if (!subjectFilter) {

        return;
    }


    const subjectIds =
        new Set();


    timetableData.forEach(
        item => {

            if (
                item.active === false
            ) {

                return;
            }


            if (
                item.subjectID
            ) {

                subjectIds.add(
                    item.subjectID
                );
            }
        }
    );


    subjectFilter.innerHTML = `

        <option value="all">
            All Subjects
        </option>

    `;


    Array.from(subjectIds)
        .sort(
            (a, b) =>
                getSubjectName(a)
                    .localeCompare(
                        getSubjectName(b)
                    )
        )
        .forEach(
            subjectId => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    subjectId;


                option.textContent =
                    getSubjectName(
                        subjectId
                    );


                subjectFilter.appendChild(
                    option
                );
            }
        );


    subjectFilter.addEventListener(
        "change",
        () => {

            renderSubjectAttendance();
        }
    );
}


// ============================================
// SUBJECT-WISE ATTENDANCE
// ============================================

function renderSubjectAttendance() {

    if (!subjectAttendanceBody) {

        return;
    }


    const selectedSubject =
        subjectFilter
            ? subjectFilter.value
            : "all";


    const scheduled =
        getScheduledClasses();


    const subjectIds =
        new Set();


    scheduled.forEach(
        item => {

            if (
                selectedSubject !== "all"
                &&
                String(
                    item.subjectID
                )
                !==
                String(
                    selectedSubject
                )
            ) {

                return;
            }


            if (
                item.subjectID
            ) {

                subjectIds.add(
                    item.subjectID
                );
            }
        }
    );


    if (subjectIds.size === 0) {

        subjectAttendanceBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-attendance">

                    No attendance data available.

                </td>

            </tr>

        `;

        return;
    }


    const rows = [];


    subjectIds.forEach(
        subjectId => {

            const subjectScheduled =
                scheduled.filter(
                    item =>
                        String(
                            item.subjectID
                        )
                        ===
                        String(
                            subjectId
                        )
                );


            const presentSessions =
                new Set();


            attendanceData.forEach(
                record => {

                    if (
                        String(
                            record.subject_id
                        )
                        !==
                        String(
                            subjectId
                        )
                    ) {

                        return;
                    }


                    if (
                        !record.date
                    ) {

                        return;
                    }


                    presentSessions.add(
                        `${record.date}_${subjectId}`
                    );
                }
            );


            const present =
                presentSessions.size;


            const total =
                subjectScheduled.length;


            const absent =
                Math.max(
                    total - present,
                    0
                );


            const percentage =
                total > 0
                    ? Math.round(
                        (present / total) * 100
                    )
                    : 0;


            rows.push({

                subjectName:
                    getSubjectName(
                        subjectId
                    ),

                present,

                absent,

                total,

                percentage

            });
        }
    );


    rows.sort(
        (a, b) =>
            a.subjectName.localeCompare(
                b.subjectName
            )
    );


    subjectAttendanceBody.innerHTML =
        rows.map(
            row => {

                const percentageClass =
                    row.percentage >= 75
                        ? "good"
                        : "low";


                const progress =
                    Math.min(
                        row.percentage,
                        100
                    );


                return `

                    <tr>

                        <td>

                            <span class="subject-name">

                                ${escapeHTML(
                                    row.subjectName
                                )}

                            </span>

                        </td>

                        <td>
                            ${row.present}
                        </td>

                        <td>
                            ${row.absent}
                        </td>

                        <td>
                            ${row.total}
                        </td>

                        <td>

                            <span
                                class="percentage ${percentageClass}">

                                ${row.percentage}%

                            </span>

                            <div class="attendance-progress">

                                <div
                                    class="attendance-progress-bar"
                                    style="width:${progress}%">
                                </div>

                            </div>

                        </td>

                    </tr>

                `;
            }
        ).join("");
}


// ============================================
// ATTENDANCE HISTORY
// ============================================

function renderAttendanceHistory() {

    if (!attendanceHistoryBody) {

        return;
    }


    if (
        attendanceData.length === 0
    ) {

        attendanceHistoryBody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty-attendance">

                    No attendance records found.

                </td>

            </tr>

        `;

        return;
    }


    const sortedRecords =
        [...attendanceData].sort(
            (a, b) => {

                const first =
                    `${a.date || ""} ${a.time || ""}`;

                const second =
                    `${b.date || ""} ${b.time || ""}`;

                return second.localeCompare(
                    first
                );
            }
        );


    // ----------------------------------------
    // Remove duplicate scans
    // ----------------------------------------

    const uniqueRecords = [];

    const seen = new Set();


    sortedRecords.forEach(
        record => {

            const key =
                `${record.date || ""}_${record.subject_id || ""}_${studentData.id}`;


            if (
                seen.has(key)
            ) {

                return;
            }


            seen.add(key);

            uniqueRecords.push(
                record
            );
        }
    );


    attendanceHistoryBody.innerHTML =
        uniqueRecords.map(
            record => {

                return `

                    <tr>

                        <td>

                            ${escapeHTML(
                                formatDate(
                                    record.date
                                )
                            )}

                        </td>

                        <td>

                            <strong>

                                ${escapeHTML(
                                    getSubjectName(
                                        record.subject_id
                                    )
                                )}

                            </strong>

                        </td>

                        <td>

                            ${escapeHTML(
                                formatTime(
                                    record.time
                                )
                            )}

                        </td>

                        <td>

                            <span
                                class="present-badge">

                                Present

                            </span>

                        </td>

                    </tr>

                `;
            }
        ).join("");
}


// ============================================
// STUDENT NOT LINKED
// ============================================

function showStudentNotLinked() {

    if (overallAttendance) {
        overallAttendance.textContent = "—";
    }

    if (totalPresent) {
        totalPresent.textContent = "—";
    }

    if (totalAbsent) {
        totalAbsent.textContent = "—";
    }

    if (totalClasses) {
        totalClasses.textContent = "—";
    }


    if (subjectAttendanceBody) {

        subjectAttendanceBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-attendance">

                    Student profile is not linked.

                    <br><br>

                    Please contact the administrator.

                </td>

            </tr>

        `;
    }


    if (attendanceHistoryBody) {

        attendanceHistoryBody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty-attendance">

                    Student profile is not linked.

                </td>

            </tr>

        `;
    }
}


// ============================================
// ERROR
// ============================================

function showError(message) {

    if (subjectAttendanceBody) {

        subjectAttendanceBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-attendance">

                    ${escapeHTML(message)}

                </td>

            </tr>

        `;
    }


    if (attendanceHistoryBody) {

        attendanceHistoryBody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty-attendance">

                    ${escapeHTML(message)}

                </td>

            </tr>

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
                    "Logout error:",
                    error
                );
            }
        }
    );
}