// ============================================================
// ATTENDIX - TEACHER ATTENDANCE
// Firebase / Firestore
// ============================================================

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAxVUihJrBhmR_0uyXJyQmD00eQ9mgq9M",
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

const app = getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// GLOBAL DATA
// ============================================================

let studentsData = [];
let subjectsData = [];
let attendanceData = [];
let timetableData = [];
let teachersData = [];

let currentTeacher = null;
let currentTeacherIds = [];


// ============================================================
// DOM ELEMENTS
// ============================================================

const pageSubtitle = document.getElementById("pageSubtitle");

const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");

const totalStudentsEl = document.getElementById("totalStudents");
const presentTodayEl = document.getElementById("presentToday");
const absentTodayEl = document.getElementById("absentToday");
const attendanceRateEl = document.getElementById("attendanceRate");

const summaryPresentEl = document.getElementById("summaryPresent");
const summaryAbsentEl = document.getElementById("summaryAbsent");
const summaryRateEl = document.getElementById("summaryRate");

const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const subjectFilter = document.getElementById("subjectFilter");
const statusFilter = document.getElementById("statusFilter");

const attendanceTableBody =
    document.getElementById("attendanceTableBody");


// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getTodayDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1)
        .padStart(2, "0");

    const day = String(now.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}


function formatTime(timeValue) {

    if (!timeValue) {
        return "—";
    }

    const value = String(timeValue);

    // Already contains AM/PM
    if (/am|pm/i.test(value)) {
        return value;
    }

    const parts = value.split(":");

    if (parts.length < 2) {
        return value;
    }

    let hour = Number(parts[0]);
    const minute = parts[1];

    if (Number.isNaN(hour)) {
        return value;
    }

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
        hour = 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}


function getSubjectById(subjectId) {

    return subjectsData.find(
        subject => subject.id === subjectId
    );
}


function getSubjectName(subjectId) {

    const subject = getSubjectById(subjectId);

    if (!subject) {
        return "Unknown Subject";
    }

    return subject.name || subject.subjectName || "Unknown Subject";
}


function getStudentById(studentId) {

    return studentsData.find(
        student => student.id === studentId
    );
}


function getStudentByRFID(rfid) {

    const normalizedRFID = normalize(rfid);

    return studentsData.find(
        student =>
            normalize(student.rfid_uid) === normalizedRFID
    );
}


function getTeacherSubjectIds() {

    const teacherIds = new Set(
        currentTeacherIds.map(id => String(id))
    );

    const teacherTimetable = timetableData.filter(item =>
        teacherIds.has(String(item.teacherUid))
    );

    return [
        ...new Set(
            teacherTimetable
                .map(item => item.subjectID)
                .filter(Boolean)
                .map(id => String(id))
        )
    ];
}


function isTeacherAttendance(record) {

    const teacherIds = currentTeacherIds.map(
        id => String(id)
    );

    return teacherIds.includes(
        String(record.teacher_uid || "")
    );
}


// ============================================================
// LOAD TEACHER PROFILE
// ============================================================

async function loadTeacherProfile(user) {

    const teachersSnapshot =
        await getDocs(collection(db, "teachers"));

    teachersData = teachersSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));


    const normalizedEmail =
        normalize(user.email);


    currentTeacher =
        teachersData.find(teacher =>
            teacher.uid === user.uid
        );


    if (!currentTeacher) {

        currentTeacher =
            teachersData.find(teacher =>
                normalize(teacher.email) === normalizedEmail
            );
    }


    if (!currentTeacher) {

        console.warn(
            "Teacher profile not found for:",
            user.email
        );

        // Fallback to auth user
        currentTeacher = {
            id: user.uid,
            uid: user.uid,
            email: user.email,
            name: user.displayName || "Teacher",
            department: "Teacher"
        };
    }


    currentTeacherIds = [
        currentTeacher.id,
        user.uid
    ];


    currentTeacherIds = [
        ...new Set(
            currentTeacherIds
                .filter(Boolean)
                .map(id => String(id))
        )
    ];


    updateTeacherHeader();
}


// ============================================================
// UPDATE HEADER
// ============================================================

function updateTeacherHeader() {

    const name =
        currentTeacher?.name ||
        "Teacher";


    const department =
        currentTeacher?.department ||
        "Teacher";


    if (userName) {
        userName.textContent = name;
    }


    if (userRole) {
        userRole.textContent =
            `${department} Department`;
    }


    if (userAvatar) {

        const initials =
            name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(word => word[0])
                .join("")
                .toUpperCase();

        userAvatar.textContent =
            initials || "T";
    }
}


// ============================================================
// LOAD STUDENTS
// ============================================================

async function loadStudents() {

    const snapshot =
        await getDocs(collection(db, "students"));

    studentsData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    // Only active students
    studentsData =
        studentsData.filter(student =>
            student.active !== false
        );
}


// ============================================================
// LOAD SUBJECTS
// ============================================================

async function loadSubjects() {

    const snapshot =
        await getDocs(collection(db, "subjects"));

    subjectsData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    subjectsData =
        subjectsData.filter(subject =>
            subject.active !== false
        );
}


// ============================================================
// LOAD TIMETABLE
// ============================================================

async function loadTimetable() {

    const snapshot =
        await getDocs(collection(db, "timetable"));

    timetableData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    timetableData =
        timetableData.filter(item =>
            item.active !== false
        );


    // Only timetable classes belonging to this teacher
    timetableData =
        timetableData.filter(item =>
            currentTeacherIds.includes(
                String(item.teacherUid)
            )
        );
}


// ============================================================
// LOAD ATTENDANCE
// ============================================================

async function loadAttendance() {

    const snapshot =
        await getDocs(collection(db, "attendance"));

    attendanceData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    // Only attendance belonging to this teacher
    attendanceData =
        attendanceData.filter(record =>
            isTeacherAttendance(record)
        );
}


// ============================================================
// POPULATE SUBJECT FILTER
// ============================================================

function populateSubjectFilter() {

    if (!subjectFilter) {
        return;
    }


    const currentValue =
        subjectFilter.value;


    subjectFilter.innerHTML = `
        <option value="">All Subjects</option>
    `;


    const teacherSubjectIds =
        getTeacherSubjectIds();


    let subjects = [];


    if (teacherSubjectIds.length > 0) {

        subjects =
            subjectsData.filter(subject =>
                teacherSubjectIds.includes(
                    String(subject.id)
                )
            );

    } else {

        // If timetable has no subject mapping yet,
        // use subjects appearing in attendance.
        const attendanceSubjectIds =
            [
                ...new Set(
                    attendanceData
                        .map(record => record.subject_id)
                        .filter(Boolean)
                        .map(id => String(id))
                )
            ];


        subjects =
            subjectsData.filter(subject =>
                attendanceSubjectIds.includes(
                    String(subject.id)
                )
            );
    }


    // If still empty, show all active subjects
    if (subjects.length === 0) {
        subjects = subjectsData;
    }


    subjects
        .sort((a, b) =>
            String(a.name || "")
                .localeCompare(
                    String(b.name || "")
                )
        )
        .forEach(subject => {

            const option =
                document.createElement("option");

            option.value = subject.id;

            option.textContent =
                subject.name || "Unnamed Subject";

            subjectFilter.appendChild(option);
        });


    if (
        currentValue &&
        [...subjectFilter.options]
            .some(option =>
                option.value === currentValue
            )
    ) {

        subjectFilter.value =
            currentValue;
    }
}


// ============================================================
// GET ATTENDANCE FOR DATE
// ============================================================

function getAttendanceForDate(date) {

    return attendanceData.filter(record =>
        String(record.date || "") === String(date)
    );
}


// ============================================================
// GET SUBJECT SESSIONS
// ============================================================

function getSessionsForDate(date, subjectId = "") {

    const selectedDate =
        new Date(`${date}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
        return [];
    }


    const weekday =
        selectedDate.toLocaleDateString(
            "en-US",
            { weekday: "long" }
        );


    return timetableData.filter(item => {

        if (normalize(item.day) !== normalize(weekday)) {
            return false;
        }


        if (
            subjectId &&
            String(item.subjectID) !== String(subjectId)
        ) {
            return false;
        }


        return true;
    });
}


// ============================================================
// GET TEACHER SUBJECT IDs FROM TIMETABLE
// ============================================================

function getTeacherSubjectIdsForDate(
    date,
    selectedSubject = ""
) {

    const sessions =
        getSessionsForDate(
            date,
            selectedSubject
        );


    return [
        ...new Set(
            sessions
                .map(item => item.subjectID)
                .filter(Boolean)
                .map(id => String(id))
        )
    ];
}


// ============================================================
// FIND STUDENTS FOR TEACHER
// ============================================================

function getTeacherStudents(
    selectedDate,
    selectedSubject
) {

    /*
     * Current Firestore schema does not contain a separate
     * student-enrollment collection.
     *
     * Therefore we build the teacher's student list from:
     *
     * 1. Attendance records belonging to this teacher
     * 2. Active students as fallback
     */


    const teacherStudentIds =
        new Set();


    // Attendance history
    attendanceData.forEach(record => {

        if (record.student_id) {

            teacherStudentIds.add(
                String(record.student_id)
            );

        } else if (record.rfid_uid) {

            const student =
                getStudentByRFID(record.rfid_uid);

            if (student) {

                teacherStudentIds.add(
                    String(student.id)
                );
            }
        }
    });


    // If attendance history exists
    if (teacherStudentIds.size > 0) {

        return studentsData.filter(student =>
            teacherStudentIds.has(
                String(student.id)
            )
        );
    }


    // Fallback:
    // all active students
    return [...studentsData];
}


// ============================================================
// CALCULATE STUDENT ATTENDANCE
// ============================================================

function calculateStudentAttendance(
    student,
    subjectId = ""
) {

    const studentId =
        String(student.id);


    const studentRFID =
        normalize(student.rfid_uid);


    let records =
        attendanceData.filter(record => {

            const sameStudent =
                String(record.student_id || "") === studentId ||
                (
                    studentRFID &&
                    normalize(record.rfid_uid) === studentRFID
                );


            if (!sameStudent) {
                return false;
            }


            if (
                subjectId &&
                String(record.subject_id || "") !==
                String(subjectId)
            ) {
                return false;
            }


            return true;
        });


    /*
     * Number of recorded attendance sessions.
     *
     * Because the current attendance schema stores only
     * successful scans, this represents scan-based attendance.
     */

    const uniqueSessions =
        new Set();


    records.forEach(record => {

        const key =
            `${record.date || ""}_${record.subject_id || ""}`;

        uniqueSessions.add(key);
    });


    const attended =
        uniqueSessions.size;


    /*
     * Total sessions:
     *
     * Use timetable dates available in attendance records.
     * This avoids inventing future/past classes that have
     * no attendance data.
     */

    const sessionKeys =
        new Set();


    records.forEach(record => {

        const key =
            `${record.date || ""}_${record.subject_id || ""}`;

        sessionKeys.add(key);
    });


    /*
     * If timetable contains actual dates in future versions,
     * those can be included here.
     *
     * With the current schema there is no timetable date field,
     * so we use recorded sessions.
     */

    const total =
        Math.max(
            sessionKeys.size,
            attended
        );


    if (total === 0) {
        return 0;
    }


    return Math.round(
        (attended / total) * 100
    );
}


// ============================================================
// GET TODAY'S / SELECTED ATTENDANCE
// ============================================================

function buildAttendanceRows() {

    const selectedDate =
        dateFilter?.value || getTodayDate();

    const selectedSubject =
        subjectFilter?.value || "";

    const selectedStatus =
        statusFilter?.value || "";

    const search =
        normalize(searchInput?.value || "");


    const dateAttendance =
        getAttendanceForDate(selectedDate);


    /*
     * Subject filter
     */

    let filteredAttendance =
        dateAttendance;


    if (selectedSubject) {

        filteredAttendance =
            filteredAttendance.filter(record =>
                String(record.subject_id || "") ===
                String(selectedSubject)
            );
    }


    /*
     * Find students
     */

    const teacherStudents =
        getTeacherStudents(
            selectedDate,
            selectedSubject
        );


    /*
     * If selected date has attendance records,
     * show students based on teacher's student list.
     */

    let rows =
        teacherStudents.map(student => {

            const studentId =
                String(student.id);

            const studentRFID =
                normalize(student.rfid_uid);


            const studentRecords =
                filteredAttendance.filter(record => {

                    return (
                        String(record.student_id || "") ===
                            studentId
                    ) ||
                    (
                        studentRFID &&
                        normalize(record.rfid_uid) ===
                            studentRFID
                    );
                });


            /*
             * A student is present if they have
             * at least one valid scan on selected date.
             */

            const present =
                studentRecords.length > 0;


            const latestRecord =
                [...studentRecords]
                    .sort((a, b) =>
                        String(b.time || "")
                            .localeCompare(
                                String(a.time || "")
                            )
                    )[0] || null;


            const attendancePercent =
                calculateStudentAttendance(
                    student,
                    selectedSubject
                );


            const subjectId =
                latestRecord?.subject_id ||
                selectedSubject ||
                "";


            return {

                student,

                present,

                latestRecord,

                subjectId,

                attendancePercent

            };

        });


    /*
     * If a specific subject is selected and the student
     * has no attendance record for that subject today,
     * still show the student as absent.
     */


    /*
     * Search
     */

    if (search) {

        rows =
            rows.filter(row => {

                const student =
                    row.student;

                return (

                    normalize(student.name)
                        .includes(search)

                    ||

                    normalize(student.roll_no)
                        .includes(search)

                    ||

                    normalize(student.email)
                        .includes(search)

                    ||

                    normalize(student.rfid_uid)
                        .includes(search)

                );

            });
    }


    /*
     * Status filter
     */

    if (selectedStatus === "present") {

        rows =
            rows.filter(row =>
                row.present
            );

    } else if (selectedStatus === "absent") {

        rows =
            rows.filter(row =>
                !row.present
            );
    }


    return rows;
}


// ============================================================
// RENDER ATTENDANCE TABLE
// ============================================================

function renderAttendanceTable() {

    if (!attendanceTableBody) {
        return;
    }


    const rows =
        buildAttendanceRows();


    if (rows.length === 0) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >
                    No attendance records found.
                </td>
            </tr>
        `;

        updateStats([]);

        return;
    }


    attendanceTableBody.innerHTML =
        rows.map(row => {

            const student =
                row.student;

            const present =
                row.present;

            const record =
                row.latestRecord;


            const subjectName =
                record?.subject_id
                    ? getSubjectName(record.subject_id)
                    : (
                        subjectFilter?.value
                            ? getSubjectName(
                                subjectFilter.value
                            )
                            : "—"
                    );


            const scanTime =
                record?.time
                    ? formatTime(record.time)
                    : "—";


            const percentage =
                row.attendancePercent;


            let progressClass =
                "green";

            if (percentage < 75) {
                progressClass = "red";
            } else if (percentage < 85) {
                progressClass = "orange";
            }


            const statusHTML =
                present
                    ? `<span class="badge badge-present">Present</span>`
                    : `<span class="badge badge-absent">Absent</span>`;


            const timeHTML =
                present
                    ? `<span class="scan-time">${escapeHTML(scanTime)}</span>`
                    : `<span class="scan-time absent">—</span>`;


            return `

                <tr>

                    <td>
                        ${escapeHTML(
                            student.roll_no || "—"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                student.name || "Unknown"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(subjectName)}
                    </td>

                    <td>
                        ${timeHTML}
                    </td>

                    <td>

                        <div class="attendance-cell">

                            <div class="progress-bar-wrap">

                                <div
                                    class="progress-bar-fill ${progressClass}"
                                    style="width:${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            percentage
                                        )
                                    )}%"
                                ></div>

                            </div>

                            <span class="attendance-pct">
                                ${percentage}%
                            </span>

                        </div>

                    </td>

                    <td>
                        ${statusHTML}
                    </td>

                </tr>

            `;

        }).join("");


    updateStats(rows);
}


// ============================================================
// UPDATE STATS
// ============================================================

function updateStats(rows) {

    const total =
        rows.length;


    const present =
        rows.filter(row =>
            row.present
        ).length;


    const absent =
        Math.max(
            0,
            total - present
        );


    const rate =
        total > 0
            ? Math.round(
                (present / total) * 100
            )
            : 0;


    if (totalStudentsEl) {
        totalStudentsEl.textContent =
            total;
    }


    if (presentTodayEl) {
        presentTodayEl.textContent =
            present;
    }


    if (absentTodayEl) {
        absentTodayEl.textContent =
            absent;
    }


    if (attendanceRateEl) {
        attendanceRateEl.textContent =
            `${rate}%`;
    }


    if (summaryPresentEl) {
        summaryPresentEl.textContent =
            present;
    }


    if (summaryAbsentEl) {
        summaryAbsentEl.textContent =
            absent;
    }


    if (summaryRateEl) {
        summaryRateEl.textContent =
            `${rate}%`;
    }
}


// ============================================================
// UPDATE DATE HEADER
// ============================================================

function updateDateHeader() {

    const selectedDate =
        dateFilter?.value || getTodayDate();


    if (pageSubtitle) {

        pageSubtitle.textContent =
            `Attendance – ${formatDate(selectedDate)}`;
    }
}


// ============================================================
// REFRESH
// ============================================================

function refreshAttendance() {

    updateDateHeader();

    renderAttendanceTable();
}


// ============================================================
// FILTER EVENTS
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        refreshAttendance
    );
}


if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        refreshAttendance
    );
}


if (subjectFilter) {

    subjectFilter.addEventListener(
        "change",
        refreshAttendance
    );
}


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        refreshAttendance
    );
}


// ============================================================
// LOAD EVERYTHING
// ============================================================

async function loadAttendancePage(user) {

    try {

        showLoading();


        console.log(
            "===================================="
        );

        console.log(
            "ATTENDIX - Teacher Attendance"
        );

        console.log(
            "Logged in:",
            user.email
        );


        // 1. Teacher
        await loadTeacherProfile(user);

        console.log(
            "Teacher:",
            currentTeacher
        );


        // 2. Students
        await loadStudents();

        console.log(
            "Students:",
            studentsData.length
        );


        // 3. Subjects
        await loadSubjects();

        console.log(
            "Subjects:",
            subjectsData.length
        );


        // 4. Timetable
        await loadTimetable();

        console.log(
            "Teacher timetable:",
            timetableData.length
        );


        // 5. Attendance
        await loadAttendance();

        console.log(
            "Teacher attendance:",
            attendanceData.length
        );


        // 6. Subject filter
        populateSubjectFilter();


        // 7. Default date
        if (dateFilter && !dateFilter.value) {
            dateFilter.value =
                getTodayDate();
        }


        // 8. Render
        refreshAttendance();


        console.log(
            "Attendance loaded successfully."
        );


    } catch (error) {

        console.error(
            "Teacher attendance error:",
            error
        );


        showError(error);
    }
}


// ============================================================
// LOADING UI
// ============================================================

function showLoading() {

    if (attendanceTableBody) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >
                    Loading attendance...
                </td>
            </tr>
        `;
    }
}


// ============================================================
// ERROR UI
// ============================================================

function showError(error) {

    const message =
        error?.message ||
        "Unable to load attendance.";


    if (attendanceTableBody) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#dc2626;
                    "
                >
                    Unable to load attendance.
                    <br><br>
                    <small>
                        ${escapeHTML(message)}
                    </small>
                </td>
            </tr>
        `;
    }


    console.error(
        "ATTENDIX Attendance Error:",
        error
    );
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            console.warn(
                "No authenticated user."
            );

            window.location.href =
                "../index.html";

            return;
        }


        await loadAttendancePage(user);
    }
);