// ============================================================
// ATTENDIX - COMMON DASHBOARD + TEACHER DASHBOARD
// Firebase Authentication + Firestore
// ============================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

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
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

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

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// GLOBAL USER
// ============================================================

window.attendixUser = null;


// ============================================================
// UTILITY
// ============================================================

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getTodayName() {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long"
    }).format(new Date());
}


function formatTime(time) {
    if (!time) return "—";

    const parts = String(time).split(":");

    if (parts.length < 2) {
        return time;
    }

    let hour = Number(parts[0]);
    const minute = parts[1];

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}


function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


// ============================================================
// MOBILE SIDEBAR
// ============================================================

function initSidebar() {

    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", () => {

        const isOpen = sidebar.classList.toggle("open");

        toggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        if (overlay) {
            overlay.classList.toggle(
                "visible",
                isOpen
            );
        }
    });

    if (overlay) {

        overlay.addEventListener("click", () => {

            sidebar.classList.remove("open");

            overlay.classList.remove("visible");

            toggle.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    }
}


// ============================================================
// SIDEBAR LINKS
// ============================================================

function initSidebarLinks() {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar) return;

    const links = sidebar.querySelectorAll("a");

    links.forEach((link) => {

        link.addEventListener("click", () => {

            sidebar.classList.remove("open");

            if (overlay) {
                overlay.classList.remove("visible");
            }
        });
    });
}


// ============================================================
// SEARCH
// ============================================================

function initSearch(
    inputId,
    tableId,
    columnIndex = -1
) {

    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);

    if (!input || !table) return;

    input.addEventListener("input", () => {

        const query = input.value
            .trim()
            .toLowerCase();

        const rows = table.querySelectorAll(
            "tbody tr"
        );

        rows.forEach((row) => {

            if (!query) {

                row.style.display = "";

                return;
            }

            let text = "";

            if (columnIndex >= 0) {

                const cell =
                    row.cells[columnIndex];

                text = cell
                    ? cell.textContent.toLowerCase()
                    : "";

            } else {

                text =
                    row.textContent.toLowerCase();
            }

            row.style.display =
                text.includes(query)
                    ? ""
                    : "none";
        });
    });
}


// ============================================================
// FILTER
// ============================================================

function initFilter(
    selectId,
    tableId,
    columnIndex
) {

    const select =
        document.getElementById(selectId);

    const table =
        document.getElementById(tableId);

    if (!select || !table) return;

    select.addEventListener("change", () => {

        const value =
            select.value
                .trim()
                .toLowerCase();

        const rows =
            table.querySelectorAll(
                "tbody tr"
            );

        rows.forEach((row) => {

            if (!value) {

                row.style.display = "";

                return;
            }

            const cell =
                row.cells[columnIndex];

            const text =
                cell
                    ? cell.textContent.toLowerCase()
                    : "";

            row.style.display =
                text.includes(value)
                    ? ""
                    : "none";
        });
    });
}


// ============================================================
// CSV
// ============================================================

function escapeCSVValue(value) {

    let text =
        String(value ?? "")
            .replace(/\r?\n|\r/g, " ")
            .trim();

    if (/^[=+\-@]/.test(text)) {
        text = "'" + text;
    }

    text = text.replace(/"/g, '""');

    return `"${text}"`;
}


function downloadCSV(
    tableId,
    filename = "attendix_report.csv"
) {

    const table =
        document.getElementById(tableId);

    if (!table) return;

    const rows =
        table.querySelectorAll("tr");

    if (!rows.length) return;

    const lines = [];

    rows.forEach((row) => {

        const cells =
            row.querySelectorAll("th, td");

        const values =
            Array.from(cells).map(
                (cell) =>
                    escapeCSVValue(
                        cell.innerText
                    )
            );

        lines.push(values.join(","));
    });

    const csvContent =
        "\uFEFF" + lines.join("\n");

    const blob =
        new Blob(
            [csvContent],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await signOut(auth);

        window.location.href =
            "../index.html";

    } catch (error) {

        console.error(
            "ATTENDIX Logout Error:",
            error
        );

        window.location.href =
            "../index.html";
    }
}

window.logout = logout;


// ============================================================
// UPDATE USER UI
// ============================================================

function updateUserUI(userData) {

    const name =
        userData.name ||
        userData.email ||
        "User";

    const role =
        userData.role || "User";

    const welcome =
        document.getElementById(
            "welcomeMessage"
        );

    const userName =
        document.getElementById(
            "userName"
        );

    const userRole =
        document.getElementById(
            "userRole"
        );

    const avatar =
        document.getElementById(
            "userAvatar"
        );

    if (welcome) {
        welcome.textContent =
            `Welcome back, ${name}`;
    }

    if (userName) {
        userName.textContent =
            name;
    }

    if (userRole) {
        userRole.textContent =
            role === "teacher"
                ? "Teacher"
                : "Administrator";
    }

    if (avatar) {

        const firstLetter =
            String(name)
                .trim()
                .charAt(0)
                .toUpperCase();

        avatar.textContent =
            firstLetter || "U";
    }
}


// ============================================================
// TEACHER DASHBOARD
// ============================================================

async function loadTeacherDashboard(user) {

    console.log(
        "ATTENDIX: Loading teacher dashboard..."
    );

    const teacherUid =
        user.uid;

    try {

        // ----------------------------------------------------
        // LOAD FIRESTORE COLLECTIONS
        // ----------------------------------------------------

        const [
            timetableSnapshot,
            subjectsSnapshot,
            studentsSnapshot,
            attendanceSnapshot,
            assignmentsSnapshot,
            teachersSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "timetable"
                )
            ),

            getDocs(
                collection(
                    db,
                    "subjects"
                )
            ),

            getDocs(
                collection(
                    db,
                    "students"
                )
            ),

            getDocs(
                collection(
                    db,
                    "attendance"
                )
            ),

            getDocs(
                collection(
                    db,
                    "teacher_assignments"
                )
            ),

            getDocs(
                collection(
                    db,
                    "teachers"
                )
            )
        ]);


        // ----------------------------------------------------
        // CONVERT SNAPSHOTS TO ARRAYS
        // ----------------------------------------------------

        const timetable =
            timetableSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        const subjects =
            subjectsSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        const students =
            studentsSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        const attendance =
            attendanceSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        const assignments =
            assignmentsSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );

        const teachers =
            teachersSnapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );


        console.log(
            "Teacher UID:",
            teacherUid
        );

        console.log(
            "Timetable:",
            timetable
        );

        console.log(
            "Subjects:",
            subjects
        );

        console.log(
            "Students:",
            students
        );

        console.log(
            "Attendance:",
            attendance
        );

        console.log(
            "Assignments:",
            assignments
        );


        // ----------------------------------------------------
        // SUBJECT MAP
        // ----------------------------------------------------

        const subjectMap =
            new Map();

        subjects.forEach(
            (subject) => {

                subjectMap.set(
                    subject.id,
                    subject
                );
            }
        );


        // ----------------------------------------------------
        // FIND TEACHER PROFILE
        // ----------------------------------------------------

        const teacherProfile =
            teachers.find(
                (teacher) => {

                    return (
                        teacher.uid === teacherUid ||
                        normalize(
                            teacher.email
                        ) === normalize(
                            user.email
                        )
                    );
                }
            );


        // ----------------------------------------------------
        // TEACHER ASSIGNED SUBJECTS
        // ----------------------------------------------------

        const assignedSubjectIds =
            new Set();

        assignments.forEach(
            (assignment) => {

                if (
                    assignment.teacher_uid ===
                    teacherUid
                ) {

                    if (
                        assignment.subject_id
                    ) {

                        assignedSubjectIds.add(
                            assignment.subject_id
                        );
                    }
                }
            }
        );


        // ----------------------------------------------------
        // ALSO GET SUBJECTS FROM TEACHER PROFILE
        // ----------------------------------------------------

        if (
            teacherProfile &&
            Array.isArray(
                teacherProfile.subjects
            )
        ) {

            teacherProfile.subjects
                .forEach(
                    (subjectName) => {

                        const found =
                            subjects.find(
                                (subject) =>
                                    normalize(
                                        subject.name
                                    ) ===
                                    normalize(
                                        subjectName
                                    )
                            );

                        if (found) {

                            assignedSubjectIds.add(
                                found.id
                            );
                        }
                    }
                );
        }


        // ----------------------------------------------------
        // TEACHER TIMETABLE
        // ----------------------------------------------------

        const teacherTimetable =
            timetable.filter(
                (item) => {

                    return (
                        item.teacherUid ===
                        teacherUid
                    );
                }
            );


        // ----------------------------------------------------
        // ALSO INCLUDE ASSIGNED SUBJECT
        // IF TEACHER UID WAS NOT SET IN TIMETABLE
        // ----------------------------------------------------

        const teacherClasses =
            teacherTimetable.length
                ? teacherTimetable
                : timetable.filter(
                    (item) =>
                        assignedSubjectIds.has(
                            item.subjectID
                        )
                );


        console.log(
            "Teacher classes:",
            teacherClasses
        );


        // ====================================================
        // TODAY'S CLASSES
        // ====================================================

        const todayName =
            getTodayName();

        const todayClasses =
            teacherClasses
                .filter(
                    (item) => {

                        return (
                            normalize(
                                item.day
                            ) ===
                            normalize(
                                todayName
                            ) &&
                            item.active !== false
                        );
                    }
                )
                .sort(
                    (a, b) =>
                        String(
                            a.startTime || ""
                        ).localeCompare(
                            String(
                                b.startTime || ""
                            )
                        )
                );


        // ----------------------------------------------------
        // TODAY CLASS COUNT
        // ----------------------------------------------------

        const todayCount =
            document.getElementById(
                "todayClassesCount"
            );

        if (todayCount) {
            todayCount.textContent =
                todayClasses.length;
        }


        // ----------------------------------------------------
        // TODAY DATE
        // ----------------------------------------------------

        const todayDate =
            document.getElementById(
                "todayDate"
            );

        if (todayDate) {

            todayDate.textContent =
                new Intl.DateTimeFormat(
                    "en-IN",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                ).format(
                    new Date()
                );
        }


        // ====================================================
        // RENDER TODAY'S CLASSES
        // ====================================================

        renderTodayClasses(
            todayClasses,
            subjectMap
        );


        // ====================================================
        // TODAY ATTENDANCE
        // ====================================================

        const today =
            formatDate(
                new Date()
            );

        const teacherAttendance =
            attendance.filter(
                (record) => {

                    if (
                        record.teacher_uid !==
                        teacherUid
                    ) {
                        return false;
                    }

                    if (
                        record.date !==
                        today
                    ) {
                        return false;
                    }

                    return true;
                }
            );


        // ====================================================
        // TEACHER ATTENDANCE - ALL TIME
        // ====================================================

        const teacherAttendanceAll =
            attendance.filter(
                (record) => {

                    return (
                        record.teacher_uid ===
                        teacherUid
                    );
                }
            );


        // ====================================================
        // MY STUDENTS
        // ====================================================

        const studentIds =
            new Set();

        teacherAttendanceAll.forEach(
            (record) => {

                if (
                    record.student_id
                ) {

                    studentIds.add(
                        record.student_id
                    );
                }
            }
        );


        // If no attendance exists yet,
        // use teacher profile student count.
        let myStudents =
            students.filter(
                (student) =>
                    studentIds.has(
                        student.id
                    ) &&
                    student.active !== false
            );


        if (
            myStudents.length === 0 &&
            teacherProfile &&
            Number(
                teacherProfile.students
            ) > 0
        ) {

            console.log(
                "No attendance-linked students yet. Teacher profile has:",
                teacherProfile.students
            );
        }


        // ----------------------------------------------------
        // MY STUDENTS COUNT
        // ----------------------------------------------------

        const myStudentsCount =
            document.getElementById(
                "myStudentsCount"
            );

        if (myStudentsCount) {

            myStudentsCount.textContent =
                myStudents.length;
        }


        // ====================================================
        // PRESENT TODAY
        // ====================================================

        const presentStudentIds =
            new Set();

        teacherAttendance.forEach(
            (record) => {

                if (
                    record.student_id
                ) {

                    presentStudentIds.add(
                        record.student_id
                    );
                }
            }
        );


        const presentToday =
            document.getElementById(
                "presentToday"
            );

        if (presentToday) {

            presentToday.textContent =
                presentStudentIds.size;
        }


        const presentSubtext =
            document.getElementById(
                "presentSubtext"
            );

        if (presentSubtext) {

            presentSubtext.textContent =
                `${teacherAttendance.length} attendance scan${
                    teacherAttendance.length === 1
                        ? ""
                        : "s"
                } today`;
        }


        // ====================================================
        // ATTENDANCE RATE
        // ====================================================

        const attendanceRate =
            document.getElementById(
                "attendanceRate"
            );

        if (attendanceRate) {

            if (myStudents.length > 0) {

                const rate =
                    Math.round(
                        (
                            presentStudentIds.size /
                            myStudents.length
                        ) * 100
                    );

                attendanceRate.textContent =
                    `${Math.min(
                        rate,
                        100
                    )}%`;

            } else {

                attendanceRate.textContent =
                    "—";
            }
        }


        // ====================================================
        // ATTENDANCE OVERVIEW
        // ====================================================

        renderAttendanceOverview(
            teacherAttendanceAll,
            students,
            subjectMap
        );


        console.log(
            "ATTENDIX: Teacher dashboard loaded successfully."
        );

    } catch (error) {

        console.error(
            "ATTENDIX Teacher Dashboard Error:",
            error
        );

        showDashboardError(
            error
        );
    }
}


// ============================================================
// SAFE FIRESTORE READ
// ============================================================
async function safeCollectionRead(name) {
    try {
        return await getDocs(collection(db, name));
    } catch (error) {
        console.warn(`ATTENDIX: Could not read ${name}:`, error);
        return { docs: [] };
    }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

async function loadAdminDashboard() {

    console.log("ATTENDIX: Loading admin dashboard...");

    try {
        const [
            studentsSnapshot,
            attendanceSnapshot,
            timetableSnapshot,
            subjectsSnapshot,
            teachersSnapshot,
            usersSnapshot
        ] = await Promise.all([
            safeCollectionRead("students"),
            safeCollectionRead("attendance"),
            safeCollectionRead("timetable"),
            safeCollectionRead("subjects"),
            safeCollectionRead("teachers"),
            safeCollectionRead("users")
        ]);

        const students = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.active !== false);

        const attendance = attendanceSnapshot.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, student_id: data.student_id || data.studentId || "", subject_id: data.subject_id || data.subjectId || data.subjectID || "" };
        });

        const timetable = timetableSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.active !== false);

        const subjects = subjectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.active !== false);

        const teacherDocs = teachersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.active !== false);

        const userDocs = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // ----------------------------------------------------
        // TOTAL TEACHERS
        // ----------------------------------------------------
        const teacherMap = new Map();
        teacherDocs.forEach(t => teacherMap.set(t.id, t));
        userDocs.filter(u => normalize(u.role) === "teacher")
            .forEach(u => {
                const uid = u.uid || u.id;
                if (!teacherMap.has(uid)) teacherMap.set(uid, u);
            });

        const totalStudentsEl = document.getElementById("totalStudents");
        const totalTeachersEl = document.getElementById("totalTeachers");

        if (totalStudentsEl) totalStudentsEl.textContent = students.length;
        if (totalTeachersEl) totalTeachersEl.textContent = teacherMap.size;

        // ----------------------------------------------------
        // TODAY'S ATTENDANCE
        // ----------------------------------------------------
        const today = formatDate(new Date());
        const todayAttendance = attendance.filter(r => String(r.date || "") === today);
        const presentIds = new Set(
            todayAttendance.map(r => r.student_id).filter(Boolean)
        );

        const presentTodayEl = document.getElementById("presentToday");
        const attendanceRateEl = document.getElementById("attendanceRate");
        const presentSubtextEl = document.getElementById("presentSubtext");

        if (presentTodayEl) presentTodayEl.textContent = presentIds.size;
        if (presentSubtextEl) {
            presentSubtextEl.textContent = `${todayAttendance.length} attendance scan${todayAttendance.length === 1 ? "" : "s"}`;
        }
        if (attendanceRateEl) {
            const rate = students.length ? (presentIds.size / students.length) * 100 : 0;
            attendanceRateEl.textContent = students.length ? `${rate.toFixed(1)}%` : "—";
        }

        // ----------------------------------------------------
        // SUBJECT / TEACHER MAPS
        // ----------------------------------------------------
        const subjectMap = new Map();
        subjects.forEach(s => subjectMap.set(s.id, s));

        const getTeacherName = uid => {
            const teacher = teacherMap.get(uid);
            return teacher?.name || teacher?.displayName || teacher?.email || "Unassigned";
        };

        // ----------------------------------------------------
        // TODAY'S CLASSES
        // ----------------------------------------------------
        const todayName = getTodayName();
        const todayClasses = timetable
            .filter(t => normalize(t.day) === normalize(todayName))
            .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));

        renderAdminTodayClasses(todayClasses, subjectMap, getTeacherName);

        // ----------------------------------------------------
        // BRANCH / YEAR SUMMARY
        // ----------------------------------------------------
        renderAdminBranchSummary(students, todayAttendance, presentIds);

        console.log("ATTENDIX: Admin dashboard loaded successfully.");

    } catch (error) {
        console.error("ATTENDIX Admin Dashboard Error:", error);
        showAdminDashboardError(error);
    }
}


function renderAdminTodayClasses(classes, subjectMap, getTeacherName) {
    const table = document.getElementById("todayClassesTable");
    if (!table) return;

    if (!classes.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:24px;">
                    No classes scheduled for today.
                </td>
            </tr>`;
        return;
    }

    table.innerHTML = classes.map(item => {
        const subject = subjectMap.get(item.subjectID);
        return `
            <tr>
                <td>${escapeHTML(formatTime(item.startTime))} - ${escapeHTML(formatTime(item.endTime))}</td>
                <td><strong>${escapeHTML(subject?.name || item.subjectID || "Unknown Subject")}</strong></td>
                <td>${escapeHTML(getTeacherName(item.teacherUid))}</td>
                <td>${escapeHTML(item.branch || item.department || "—")}</td>
                <td>${escapeHTML(item.room || "—")}</td>
                <td>${escapeHTML(item.type || "Lecture")}</td>
                <td><span class="status-badge">Scheduled</span></td>
            </tr>`;
    }).join("");
}


function renderAdminBranchSummary(students, todayAttendance, presentIds) {
    const table = document.getElementById("branchAttendanceTable");
    if (!table) return;

    if (!students.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:24px;">
                    No students registered yet.
                </td>
            </tr>`;
        return;
    }

    const studentById = new Map(students.map(s => [s.id, s]));
    const groups = new Map();

    students.forEach(student => {
        const branch = student.branch || student.department || "AI & DS";
        const year = student.year || student.class || student.academicYear || "—";
        const key = `${branch}|||${year}`;

        if (!groups.has(key)) {
            groups.set(key, {
                branch,
                year,
                total: 0,
                present: 0,
                presentIds: new Set()
            });
        }

        groups.get(key).total++;
    });

    presentIds.forEach(id => {
        const student = studentById.get(id);
        if (!student) return;

        const branch = student.branch || student.department || "AI & DS";
        const year = student.year || student.class || student.academicYear || "—";
        const key = `${branch}|||${year}`;
        const group = groups.get(key);

        if (group) group.presentIds.add(id);
    });

    const rows = [...groups.values()].map(group => {
        group.present = group.presentIds.size;
        group.absent = Math.max(group.total - group.present, 0);
        group.rate = group.total ? (group.present / group.total) * 100 : 0;
        return group;
    }).sort((a, b) => String(a.branch).localeCompare(String(b.branch)) || String(a.year).localeCompare(String(b.year)));

    table.innerHTML = rows.map(group => `
        <tr>
            <td>${escapeHTML(group.branch)}</td>
            <td>${escapeHTML(group.year)}</td>
            <td>${group.total}</td>
            <td>${group.present}</td>
            <td>${group.absent}</td>
            <td>${group.rate.toFixed(1)}%</td>
            <td>
                <span class="status-badge ${group.rate >= 75 ? "present" : ""}">
                    ${group.rate >= 75 ? "Good" : "Low"}
                </span>
            </td>
        </tr>
    `).join("");
}


function showAdminDashboardError(error) {
    const message = error?.code === "permission-denied"
        ? "Firebase permission denied. Check your Firestore rules."
        : "Unable to load dashboard data.";

    const todayTable = document.getElementById("todayClassesTable");
    if (todayTable) {
        todayTable.innerHTML = `
            <tr><td colspan="7" style="text-align:center;padding:24px;color:#dc2626;">
                ${escapeHTML(message)}
            </td></tr>`;
    }

    const branchTable = document.getElementById("branchAttendanceTable");
    if (branchTable) {
        branchTable.innerHTML = `
            <tr><td colspan="7" style="text-align:center;padding:24px;color:#dc2626;">
                ${escapeHTML(message)}
            </td></tr>`;
    }

    ["totalStudents", "totalTeachers", "presentToday"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
    });
    const rateEl = document.getElementById("attendanceRate");
    if (rateEl) rateEl.textContent = "0%";
}


// ============================================================
// TODAY'S CLASSES RENDER
// ============================================================

function renderTodayClasses(
    classes,
    subjectMap
) {

    const table =
        document.getElementById(
            "todayClassesTable"
        );

    if (!table) return;


    if (!classes.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:24px;
                    "
                >
                    No classes scheduled for today.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        classes.map(
            (item) => {

                const subject =
                    subjectMap.get(
                        item.subjectID
                    );

                const subjectName =
                    subject?.name ||
                    item.subjectID ||
                    "Unknown Subject";


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                formatTime(
                                    item.startTime
                                )
                            )}
                            -
                            ${escapeHTML(
                                formatTime(
                                    item.endTime
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
                                item.branch ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.room ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.type ||
                                "Lecture"
                            )}
                        </td>

                        <td>
                            <span class="status-badge">
                                Scheduled
                            </span>
                        </td>

                    </tr>
                `;
            }
        ).join("");
}


// ============================================================
// ATTENDANCE OVERVIEW
// ============================================================

function renderAttendanceOverview(
    attendanceRecords,
    students,
    subjectMap
) {

    const table =
        document.getElementById(
            "attendanceOverviewTable"
        );

    if (!table) return;


    // --------------------------------------------------------
    // Keep latest attendance scan per student + subject
    // --------------------------------------------------------

    const latestMap =
        new Map();


    attendanceRecords.forEach(
        (record) => {

            const key =
                `${record.student_id}_${record.subject_id}`;

            const existing =
                latestMap.get(key);

            if (
                !existing ||
                String(
                    record.date || ""
                ) +
                String(
                    record.time || ""
                ) >
                String(
                    existing.date || ""
                ) +
                String(
                    existing.time || ""
                )
            ) {

                latestMap.set(
                    key,
                    record
                );
            }
        }
    );


    const rows =
        Array.from(
            latestMap.values()
        )
        .map(
            (record) => {

                const student =
                    students.find(
                        (item) =>
                            item.id ===
                            record.student_id
                    );

                const subject =
                    subjectMap.get(
                        record.subject_id
                    );


                return {
                    record,
                    student,
                    subject
                };
            }
        )
        .sort(
            (a, b) =>
                String(
                    a.student?.roll_no ||
                    ""
                ).localeCompare(
                    String(
                        b.student?.roll_no ||
                        ""
                    )
                )
        );


    if (!rows.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:24px;
                    "
                >
                    No attendance data available yet.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        rows.slice(0, 10)
            .map(
                ({
                    record,
                    student,
                    subject
                }) => {

                    const studentName =
                        student?.name ||
                        "Unknown Student";

                    const rollNo =
                        student?.roll_no ||
                        "—";

                    const subjectName =
                        subject?.name ||
                        record.subject_id ||
                        "Unknown Subject";


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    rollNo
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        studentName
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    subjectName
                                )}
                            </td>

                            <td>
                                Present
                            </td>

                            <td>
                                ${escapeHTML(
                                    record.date ||
                                    "—"
                                )}
                                ${
                                    record.time
                                        ? ` ${escapeHTML(
                                            formatTime(
                                                record.time
                                            )
                                        )}`
                                        : ""
                                }
                            </td>

                            <td>
                                <span class="status-badge present">
                                    Present
                                </span>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ============================================================
// ERROR DISPLAY
// ============================================================

function showDashboardError(error) {

    console.error(
        "Dashboard error:",
        error
    );


    const todayTable =
        document.getElementById(
            "todayClassesTable"
        );

    if (todayTable) {

        todayTable.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:24px;
                    "
                >
                    Unable to load dashboard data.
                </td>
            </tr>
        `;
    }


    const attendanceTable =
        document.getElementById(
            "attendanceOverviewTable"
        );

    if (attendanceTable) {

        attendanceTable.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:24px;
                    "
                >
                    Unable to load attendance data.
                </td>
            </tr>
        `;
    }
}


// ============================================================
// AUTHENTICATION PROTECTION
// ============================================================

function protectDashboard() {

    onAuthStateChanged(
        auth,
        async (user) => {

            // ------------------------------------------------
            // NOT LOGGED IN
            // ------------------------------------------------

            if (!user) {

                window.location.href =
                    "../index.html";

                return;
            }


            try {

                // --------------------------------------------
                // GET USER DOCUMENT
                // --------------------------------------------

                const userRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );

                const userSnapshot =
                    await getDoc(
                        userRef
                    );


                if (
                    !userSnapshot.exists()
                ) {

                    await signOut(
                        auth
                    );

                    window.location.href =
                        "../index.html";

                    return;
                }


                const userData =
                    userSnapshot.data();


                const role =
                    String(
                        userData.role || ""
                    )
                    .trim()
                    .toLowerCase();


                // --------------------------------------------
                // PAGE ROLE CHECK
                // --------------------------------------------

                const requiredRole =
                    document.body.dataset.role;


                const roleAllowed =
                    !requiredRole ||
                    requiredRole === "admin-or-teacher"
                        ? (
                            !requiredRole ||
                            ["admin", "teacher"].includes(role)
                        )
                        : role === requiredRole;

                if (!roleAllowed) {

                    console.warn(
                        `ATTENDIX: ${role} user attempted to access ${requiredRole} page.`
                    );

                    window.location.href =
                        role === "admin"
                            ? "admin.html"
                            : "teacher.html";

                    return;
                }


                // --------------------------------------------
                // STORE USER
                // --------------------------------------------

                window.attendixUser = {

                    uid: user.uid,

                    email:
                        user.email ||
                        userData.email ||
                        "",

                    name:
                        userData.name ||
                        "",

                    role
                };


                // --------------------------------------------
                // UPDATE HEADER
                // --------------------------------------------

                updateUserUI(
                    window.attendixUser
                );

                // RFID Registration is shared by Admin and Teacher.
                // Keep the user inside their own panel instead of
                // redirecting a teacher back to the dashboard.
                if (requiredRole === "admin-or-teacher") {
                    const homeLink = document.getElementById("panelHomeLink");
                    const panelRoleLabel = document.getElementById("panelRoleLabel");
                    if (homeLink) {
                        homeLink.href = role === "teacher" ? "teacher.html" : "admin.html";
                    }
                    if (panelRoleLabel) {
                        panelRoleLabel.textContent = role === "teacher" ? "Teacher Panel" : "Admin Panel";
                    }
                }


                // --------------------------------------------
                // USER READY EVENT
                // --------------------------------------------

                document.dispatchEvent(
                    new CustomEvent(
                        "attendixUserReady",
                        {
                            detail:
                                window.attendixUser
                        }
                    )
                );


                // --------------------------------------------
                // ROLE-SPECIFIC DASHBOARD
                // --------------------------------------------

                if (
                    role === "teacher" &&
                    requiredRole === "teacher"
                ) {
                    await loadTeacherDashboard(user);
                }

                if (
                    role === "admin" &&
                    requiredRole === "admin"
                ) {
                    await loadAdminDashboard();
                }


            } catch (error) {

                console.error(
                    "ATTENDIX Auth Error:",
                    error
                );

                await signOut(
                    auth
                );

                window.location.href =
                    "../index.html";
            }
        }
    );
}


// ============================================================
// CSV BUTTON
// ============================================================

function initCSVButton() {

    const csvButton =
        document.getElementById(
            "csvDownloadBtn"
        );

    if (!csvButton) return;


    csvButton.addEventListener(
        "click",
        () => {

            const tableId =
                csvButton.dataset.table ||
                "dataTable";

            const filename =
                csvButton.dataset.file ||
                "attendix_report.csv";


            downloadCSV(
                tableId,
                filename
            );
        }
    );
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initSidebar();

        initSidebarLinks();

        protectDashboard();

        initCSVButton();


        // ----------------------------------------------------
        // GENERIC SEARCH
        // ----------------------------------------------------

        initSearch(
            "searchInput",
            "dataTable",
            -1
        );


        // ----------------------------------------------------
        // GENERIC FILTERS
        // ----------------------------------------------------

        initFilter(
            "yearFilter",
            "dataTable",
            2
        );


        initFilter(
            "subjectFilter",
            "dataTable",
            2
        );


        initFilter(
            "statusFilter",
            "dataTable",
            5
        );
    }
);


// ============================================================
// GLOBAL HELPERS
// ============================================================

window.initSearch =
    initSearch;

window.initFilter =
    initFilter;

window.downloadCSV =
    downloadCSV;