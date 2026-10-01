// ============================================================
// ATTENDIX - MY STUDENTS
// Teacher Student List + Attendance
// ============================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "PASTE_YOUR_CURRENT_FIREBASE_API_KEY_HERE",
    authDomain: "attendix-rfid-attendance.firebaseapp.com",
    projectId: "attendix-rfid-attendance",
    storageBucket: "attendix-rfid-attendance.firebasestorage.app",
    messagingSenderId: "1038365817716",
    appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
    measurementId: "G-ZYCH6VZHD0"
};


// ============================================================
// INITIALIZE
// ============================================================

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// DATA
// ============================================================

let allStudents = [];
let allAttendance = [];
let allTimetable = [];
let allAssignments = [];
let allSubjects = [];
let allTeachers = [];

let currentAuthUid = "";
let currentTeacherDocId = "";


// ============================================================
// ELEMENTS
// ============================================================

const totalStudentsEl =
    document.getElementById("totalStudents");

const goodAttendanceEl =
    document.getElementById("goodAttendance");

const lowAttendanceEl =
    document.getElementById("lowAttendance");

const averageAttendanceEl =
    document.getElementById("averageAttendance");

const studentsTableBody =
    document.getElementById("studentsTableBody");

const searchInput =
    document.getElementById("searchInput");

const yearFilter =
    document.getElementById("yearFilter");

const statusFilter =
    document.getElementById("statusFilter");

const pageSubtitle =
    document.getElementById("pageSubtitle");

const studentGroup =
    document.getElementById("studentGroup");

const studentTableSubtitle =
    document.getElementById("studentTableSubtitle");


// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
    return String(value ?? "")
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


function getInitials(name) {

    const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
        return "ST";
    }

    if (words.length === 1) {
        return words[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();
}


function formatTime(time) {

    if (!time) {
        return "";
    }

    const parts = String(time).split(":");

    if (parts.length < 2) {
        return String(time);
    }

    let hour = Number(parts[0]);
    const minute = parts[1];

    const suffix = hour >= 12
        ? "PM"
        : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}


function formatScanTime(date, time) {

    if (!date && !time) {
        return "Never";
    }

    if (date && time) {
        return `${date} ${formatTime(time)}`;
    }

    return date || formatTime(time);
}


// ============================================================
// GET TEACHER PROFILE
// ============================================================

async function findCurrentTeacher() {

    console.log(
        "Searching teacher profile for:",
        currentAuthUid
    );

    const snapshot = await getDocs(
        collection(db, "teachers")
    );

    allTeachers = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));

    console.log(
        "All teacher profiles:",
        allTeachers
    );

    const teacher = allTeachers.find(item => {

        const uidMatch =
            String(item.uid || "") === currentAuthUid;

        const emailMatch =
            normalize(item.email) ===
            normalize(auth.currentUser?.email);

        return uidMatch || emailMatch;
    });

    if (teacher) {

        currentTeacherDocId = teacher.id;

        console.log(
            "Teacher profile found:",
            teacher
        );

        console.log(
            "Teacher document ID:",
            currentTeacherDocId
        );

        return teacher;
    }

    console.warn(
        "Teacher profile not found for:",
        currentAuthUid
    );

    return null;
}


// ============================================================
// LOAD DATA
// ============================================================

async function loadStudentData() {

    try {

        console.log(
            "ATTENDIX: Loading My Students..."
        );


        // --------------------------------------------------------
        // TEACHER PROFILE
        // --------------------------------------------------------

        const teacher =
            await findCurrentTeacher();


        if (!teacher) {

            showError(
                "Teacher profile not found. Please contact administrator."
            );

            return;
        }


        // --------------------------------------------------------
        // STUDENTS
        // --------------------------------------------------------

        const studentsSnapshot =
            await getDocs(
                collection(db, "students")
            );

        allStudents =
            studentsSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        // --------------------------------------------------------
        // ATTENDANCE
        // --------------------------------------------------------

        const attendanceSnapshot =
            await getDocs(
                collection(db, "attendance")
            );

        allAttendance =
            attendanceSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        // --------------------------------------------------------
        // TIMETABLE
        // --------------------------------------------------------

        const timetableSnapshot =
            await getDocs(
                collection(db, "timetable")
            );

        allTimetable =
            timetableSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        // --------------------------------------------------------
        // ASSIGNMENTS
        // --------------------------------------------------------

        const assignmentsSnapshot =
            await getDocs(
                collection(db, "teacher_assignments")
            );

        allAssignments =
            assignmentsSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        // --------------------------------------------------------
        // SUBJECTS
        // --------------------------------------------------------

        const subjectsSnapshot =
            await getDocs(
                collection(db, "subjects")
            );

        allSubjects =
            subjectsSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        // --------------------------------------------------------
        // DEBUG
        // --------------------------------------------------------

        console.log(
            "Students:",
            allStudents
        );

        console.log(
            "Attendance:",
            allAttendance
        );

        console.log(
            "Timetable:",
            allTimetable
        );

        console.log(
            "Assignments:",
            allAssignments
        );

        console.log(
            "Subjects:",
            allSubjects
        );


        // --------------------------------------------------------
        // UPDATE PAGE
        // --------------------------------------------------------

        updatePage();

    } catch (error) {

        console.error(
            "ATTENDIX My Students Error:",
            error
        );

        showError(
            `Unable to load student data: ${error.message}`
        );
    }
}


// ============================================================
// CHECK TEACHER ID
// ============================================================

function isCurrentTeacher(value) {

    const id =
        String(value || "");

    return (
        id === currentAuthUid ||
        id === currentTeacherDocId
    );
}


// ============================================================
// GET TEACHER STUDENTS
// ============================================================

function getTeacherStudents() {

    const teacherIds = new Set([
        currentAuthUid,
        currentTeacherDocId
    ]);

    console.log(
        "Accepted teacher IDs:",
        [...teacherIds]
    );


    // --------------------------------------------------------
    // FIND ASSIGNED SUBJECTS
    // --------------------------------------------------------

    const assignedSubjectIds = new Set();

    allAssignments.forEach(assignment => {

        if (
            teacherIds.has(
                String(assignment.teacher_uid || "")
            )
        ) {

            if (assignment.subject_id) {

                assignedSubjectIds.add(
                    String(assignment.subject_id)
                );
            }
        }
    });


    // --------------------------------------------------------
    // FIND TIMETABLE SUBJECTS
    // --------------------------------------------------------

    allTimetable.forEach(item => {

        if (
            teacherIds.has(
                String(item.teacherUid || "")
            )
        ) {

            if (item.subjectID) {

                assignedSubjectIds.add(
                    String(item.subjectID)
                );
            }
        }
    });


    console.log(
        "Teacher subject IDs:",
        [...assignedSubjectIds]
    );


    // --------------------------------------------------------
    // FIND ATTENDANCE OF TEACHER
    // --------------------------------------------------------

    const teacherAttendance =
        allAttendance.filter(record => {

            return teacherIds.has(
                String(record.teacher_uid || "")
            );
        });


    console.log(
        "Teacher attendance:",
        teacherAttendance
    );


    // --------------------------------------------------------
    // FIND STUDENTS FROM ATTENDANCE
    // --------------------------------------------------------

    const studentIds = new Set();

    teacherAttendance.forEach(record => {

        if (record.student_id) {

            studentIds.add(
                String(record.student_id)
            );
        }
    });


    // --------------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------------
    // If RFID attendance has not started yet,
    // show all active students.
    //
    // This allows teacher to see students even
    // before their first RFID scan.
    // --------------------------------------------------------

    let teacherStudents =
        allStudents.filter(student =>
            student.active !== false
        );


    // --------------------------------------------------------
    // If teacher attendance exists,
    // prefer students belonging to that teacher.
    // --------------------------------------------------------

    if (studentIds.size > 0) {

        const attendanceStudents =
            allStudents.filter(student =>
                student.active !== false &&
                studentIds.has(
                    String(student.id)
                )
            );

        if (attendanceStudents.length > 0) {
            teacherStudents =
                attendanceStudents;
        }
    }


    console.log(
        "Final teacher students:",
        teacherStudents
    );


    return teacherStudents;
}


// ============================================================
// CALCULATE ATTENDANCE
// ============================================================

function calculateAttendance(studentId) {

    const teacherIds = new Set([
        currentAuthUid,
        currentTeacherDocId
    ]);


    // --------------------------------------------------------
    // ONLY THIS TEACHER'S ATTENDANCE
    // --------------------------------------------------------

    const studentAttendance =
        allAttendance.filter(record => {

            const correctStudent =
                String(record.student_id || "") ===
                String(studentId);

            const correctTeacher =
                teacherIds.has(
                    String(record.teacher_uid || "")
                );

            return (
                correctStudent &&
                correctTeacher
            );
        });


    // --------------------------------------------------------
    // PRESENT
    // --------------------------------------------------------

    const present =
        studentAttendance.length;


    // --------------------------------------------------------
    // TEACHER'S TIMETABLE
    // --------------------------------------------------------

    const teacherClasses =
        allTimetable.filter(item =>
            teacherIds.has(
                String(item.teacherUid || "")
            )
        );


    const totalClasses =
        teacherClasses.length;


    // --------------------------------------------------------
    // PERCENTAGE
    // --------------------------------------------------------

    let percentage = 0;

    if (totalClasses > 0) {

        percentage =
            Math.round(
                Math.min(
                    (present / totalClasses) * 100,
                    100
                )
            );

    } else {

        percentage =
            present > 0
                ? 100
                : 0;
    }


    // --------------------------------------------------------
    // LAST SCAN
    // --------------------------------------------------------

    const sorted =
        [...studentAttendance].sort(
            (a, b) => {

                const dateA =
                    `${a.date || ""} ${a.time || ""}`;

                const dateB =
                    `${b.date || ""} ${b.time || ""}`;

                return dateB.localeCompare(dateA);
            }
        );


    const lastScan =
        sorted[0] || null;


    return {

        total:
            totalClasses,

        present,

        percentage,

        lastScan,

        status:
            percentage >= 75
                ? "Good"
                : "Low"
    };
}


// ============================================================
// UPDATE PAGE
// ============================================================

function updatePage() {

    const teacherStudents =
        getTeacherStudents();


    const studentsWithAttendance =
        teacherStudents.map(student => ({

            ...student,

            attendance:
                calculateAttendance(
                    student.id
                )
        }));


    updateStatistics(
        studentsWithAttendance
    );


    renderStudents(
        studentsWithAttendance
    );


    updatePageText(
        teacherStudents
    );
}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics(students) {

    const total =
        students.length;

    const good =
        students.filter(student =>
            student.attendance.percentage >= 75
        ).length;

    const low =
        students.filter(student =>
            student.attendance.percentage < 75
        ).length;


    let average = 0;

    if (total > 0) {

        const sum =
            students.reduce(
                (totalValue, student) =>
                    totalValue +
                    student.attendance.percentage,
                0
            );

        average =
            Math.round(
                sum / total
            );
    }


    if (totalStudentsEl) {
        totalStudentsEl.textContent =
            total;
    }

    if (goodAttendanceEl) {
        goodAttendanceEl.textContent =
            good;
    }

    if (lowAttendanceEl) {
        lowAttendanceEl.textContent =
            low;
    }

    if (averageAttendanceEl) {
        averageAttendanceEl.textContent =
            `${average}%`;
    }
}


// ============================================================
// PAGE TEXT
// ============================================================

function updatePageText(students) {

    const activeStudents =
        students.filter(
            student =>
                student.active !== false
        );


    const branches = [
        ...new Set(
            activeStudents
                .map(student =>
                    student.department
                )
                .filter(Boolean)
        )
    ];


    const classes = [
        ...new Set(
            activeStudents
                .map(student =>
                    student.class
                )
                .filter(Boolean)
        )
    ];


    if (pageSubtitle) {

        pageSubtitle.textContent =
            classes.length
                ? classes.join(" · ")
                : `${students.length} assigned students`;
    }


    if (studentGroup) {

        studentGroup.textContent =
            branches.length
                ? branches.join(" · ")
                : "Assigned students";
    }


    if (studentTableSubtitle) {

        studentTableSubtitle.textContent =
            `${students.length} students enrolled`;
    }
}


// ============================================================
// RENDER STUDENTS
// ============================================================

function renderStudents(students) {

    if (!studentsTableBody) {
        return;
    }


    if (!students.length) {

        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No students found.
                </td>
            </tr>
        `;

        return;
    }


    studentsTableBody.innerHTML =
        students.map(student => {

            const attendance =
                student.attendance;

            const percentage =
                attendance.percentage;


            let progressClass =
                "green";

            if (
                percentage < 75 &&
                percentage >= 60
            ) {
                progressClass =
                    "orange";
            }

            if (percentage < 60) {
                progressClass =
                    "red";
            }


            const status =
                percentage >= 75
                    ? "Good"
                    : "Low";


            const statusClass =
                percentage >= 75
                    ? "badge-present"
                    : "badge-absent";


            let lastScan =
                "Never";

            if (attendance.lastScan) {

                lastScan =
                    formatScanTime(
                        attendance.lastScan.date,
                        attendance.lastScan.time
                    );
            }


            const initials =
                getInitials(
                    student.name
                );


            return `
                <tr
                    data-student-id="${escapeHTML(
                        student.id
                    )}"
                >

                    <td>
                        ${escapeHTML(
                            student.roll_no || "—"
                        )}
                    </td>


                    <td>

                        <div class="student-name">

                            <div class="student-avatar">
                                ${escapeHTML(
                                    initials
                                )}
                            </div>

                            <div class="student-details">

                                <strong>
                                    ${escapeHTML(
                                        student.name ||
                                        "Unnamed Student"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        student.class || "—"
                                    )}
                                </span>

                            </div>

                        </div>

                    </td>


                    <td>
                        ${escapeHTML(
                            student.department || "—"
                        )}
                    </td>


                    <td>

                        <div class="attendance-cell">

                            <div class="progress-bar-wrap">

                                <div
                                    class="progress-bar-fill ${progressClass}"
                                    style="width:${percentage}%"
                                ></div>

                            </div>

                            <span class="attendance-pct">
                                ${percentage}%
                            </span>

                        </div>

                    </td>


                    <td>
                        ${escapeHTML(
                            lastScan
                        )}
                    </td>


                    <td>

                        <span
                            class="badge ${statusClass}"
                        >
                            ${status}
                        </span>

                    </td>

                </tr>
            `;
        }).join("");
}


// ============================================================
// FILTERS
// ============================================================

function applyFilters() {

    const teacherStudents =
        getTeacherStudents();


    const students =
        teacherStudents.map(student => ({

            ...student,

            attendance:
                calculateAttendance(
                    student.id
                )
        }));


    const search =
        normalize(
            searchInput?.value
        );

    const year =
        normalize(
            yearFilter?.value
        );

    const status =
        normalize(
            statusFilter?.value
        );


    const filtered =
        students.filter(student => {

            const searchText = [
                student.name,
                student.roll_no,
                student.email,
                student.rfid_uid
            ]
                .map(normalize)
                .join(" ");


            if (
                search &&
                !searchText.includes(search)
            ) {
                return false;
            }


            if (
                year &&
                normalize(student.class) !== year
            ) {
                return false;
            }


            const studentStatus =
                student.attendance.percentage >= 75
                    ? "present"
                    : "absent";


            if (
                status &&
                studentStatus !== status
            ) {
                return false;
            }


            return true;
        });


    renderStudents(filtered);
}


// ============================================================
// FILTER EVENTS
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        applyFilters
    );
}


if (yearFilter) {

    yearFilter.addEventListener(
        "change",
        applyFilters
    );
}


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        applyFilters
    );
}


// ============================================================
// ERROR
// ============================================================

function showError(message) {

    if (!studentsTableBody) {
        return;
    }


    studentsTableBody.innerHTML = `
        <tr>

            <td
                colspan="6"
                style="
                    text-align:center;
                    padding:30px;
                    color:#dc2626;
                "
            >
                ${escapeHTML(message)}
            </td>

        </tr>
    `;
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            console.log(
                "No authenticated teacher."
            );

            window.location.href =
                "../index.html";

            return;
        }


        currentAuthUid =
            user.uid;


        console.log(
            "Logged-in Firebase UID:",
            currentAuthUid
        );

        console.log(
            "Logged-in email:",
            user.email
        );


        await loadStudentData();
    }
);