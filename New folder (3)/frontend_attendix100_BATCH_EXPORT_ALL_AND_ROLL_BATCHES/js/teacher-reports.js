// ============================================================
// ATTENDIX - TEACHER REPORTS
// Firebase / Firestore
// ============================================================

import {
    initializeApp,
    getApps
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
    apiKey: "AIzaSyAxVUihJrBhmR_0uyXJyQmD00eQ9mgq9M",
    authDomain: "attendix-rfid-attendance.firebaseapp.com",
    projectId: "attendix-rfid-attendance",
    storageBucket: "attendix-rfid-attendance.firebasestorage.app",
    messagingSenderId: "1038365817716",
    appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
    measurementId: "G-ZYCH6VZHD0"
};


// ============================================================
// FIREBASE INITIALIZE
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
// DOM
// ============================================================

const pageSubtitle =
    document.getElementById("pageSubtitle");

const userAvatar =
    document.getElementById("userAvatar");

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");


const totalStudentsEl =
    document.getElementById("totalStudents");

const totalPresentEl =
    document.getElementById("totalPresent");

const totalAbsentEl =
    document.getElementById("totalAbsent");

const attendanceRateEl =
    document.getElementById("attendanceRate");


const searchInput =
    document.getElementById("searchInput");

const startDateFilter =
    document.getElementById("startDateFilter");

const endDateFilter =
    document.getElementById("endDateFilter");

const subjectFilter =
    document.getElementById("subjectFilter");

const statusFilter =
    document.getElementById("statusFilter");

const reportsTableBody =
    document.getElementById("reportsTableBody");

const csvDownloadBtn =
    document.getElementById("csvDownloadBtn");


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

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getFirstDayOfMonth() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    return `${year}-${month}-01`;
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
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


function clampPercentage(value) {

    return Math.min(
        100,
        Math.max(
            0,
            Number(value) || 0
        )
    );
}


// ============================================================
// FIND STUDENT
// ============================================================

function getStudentById(studentId) {

    return studentsData.find(
        student =>
            String(student.id) ===
            String(studentId)
    );
}


function getStudentByRFID(rfid) {

    const uid =
        normalize(rfid);

    if (!uid) {
        return null;
    }

    return studentsData.find(
        student =>
            normalize(student.rfid_uid) === uid
    );
}


// ============================================================
// SUBJECT
// ============================================================

function getSubjectById(subjectId) {

    return subjectsData.find(
        subject =>
            String(subject.id) ===
            String(subjectId)
    );
}


function getSubjectName(subjectId) {

    const subject =
        getSubjectById(subjectId);

    return subject?.name ||
        subject?.subjectName ||
        "Unknown Subject";
}


// ============================================================
// TEACHER PROFILE
// ============================================================

async function loadTeacherProfile(user) {

    const snapshot =
        await getDocs(
            collection(db, "teachers")
        );

    teachersData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    const normalizedEmail =
        normalize(user.email);


    // First: Firebase UID
    currentTeacher =
        teachersData.find(
            teacher =>
                String(teacher.uid || "") ===
                String(user.uid)
        );


    // Second: email
    if (!currentTeacher) {

        currentTeacher =
            teachersData.find(
                teacher =>
                    normalize(teacher.email) ===
                    normalizedEmail
            );
    }


    // Fallback
    if (!currentTeacher) {

        currentTeacher = {

            id: user.uid,

            uid: user.uid,

            email: user.email,

            name:
                user.displayName ||
                "Teacher",

            department:
                "Teacher"

        };
    }


    currentTeacherIds = [
        currentTeacher.id,
        currentTeacher.uid,
        user.uid
    ]
        .filter(Boolean)
        .map(id => String(id));


    currentTeacherIds =
        [...new Set(currentTeacherIds)];


    updateTeacherHeader();
}


// ============================================================
// HEADER
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
        await getDocs(
            collection(db, "students")
        );

    studentsData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    studentsData =
        studentsData.filter(
            student =>
                student.active !== false
        );
}


// ============================================================
// LOAD SUBJECTS
// ============================================================

async function loadSubjects() {

    const snapshot =
        await getDocs(
            collection(db, "subjects")
        );

    subjectsData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    subjectsData =
        subjectsData.filter(
            subject =>
                subject.active !== false
        );
}


// ============================================================
// LOAD TIMETABLE
// ============================================================

async function loadTimetable() {

    const snapshot =
        await getDocs(
            collection(db, "timetable")
        );

    timetableData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    timetableData =
        timetableData.filter(
            item =>
                item.active !== false
        );


    // Only current teacher's timetable
    timetableData =
        timetableData.filter(
            item =>
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
        await getDocs(
            collection(db, "attendance")
        );

    attendanceData =
        snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));


    // Only current teacher's attendance
    attendanceData =
        attendanceData.filter(
            record =>
                currentTeacherIds.includes(
                    String(record.teacher_uid)
                )
        );
}


// ============================================================
// SUBJECT FILTER
// ============================================================

function populateSubjectFilter() {

    if (!subjectFilter) {
        return;
    }


    const oldValue =
        subjectFilter.value;


    subjectFilter.innerHTML = `
        <option value="">
            All Subjects
        </option>
    `;


    const subjectIds = [
        ...new Set(
            timetableData
                .map(item => item.subjectID)
                .filter(Boolean)
                .map(id => String(id))
        )
    ];


    let subjects =
        subjectsData.filter(
            subject =>
                subjectIds.includes(
                    String(subject.id)
                )
        );


    // Fallback to attendance subjects
    if (subjects.length === 0) {

        const attendanceSubjectIds = [
            ...new Set(
                attendanceData
                    .map(
                        record =>
                            record.subject_id
                    )
                    .filter(Boolean)
                    .map(id => String(id))
            )
        ];


        subjects =
            subjectsData.filter(
                subject =>
                    attendanceSubjectIds.includes(
                        String(subject.id)
                    )
            );
    }


    // Final fallback
    if (subjects.length === 0) {
        subjects = subjectsData;
    }


    subjects
        .sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || "")
                    )
        )
        .forEach(subject => {

            const option =
                document.createElement("option");

            option.value =
                subject.id;

            option.textContent =
                subject.name ||
                "Unnamed Subject";

            subjectFilter.appendChild(
                option
            );
        });


    if (
        oldValue &&
        [...subjectFilter.options]
            .some(
                option =>
                    option.value === oldValue
            )
    ) {

        subjectFilter.value =
            oldValue;
    }
}


// ============================================================
// DATE RANGE
// ============================================================

function getDateRange() {

    let start =
        startDateFilter?.value ||
        getFirstDayOfMonth();

    let end =
        endDateFilter?.value ||
        getTodayDate();


    // Correct reversed dates
    if (start > end) {

        const temp = start;

        start = end;

        end = temp;
    }


    return {
        start,
        end
    };
}


// ============================================================
// GENERATE DATES
// ============================================================

function generateDates(
    startDate,
    endDate
) {

    const dates = [];

    const current =
        new Date(
            `${startDate}T00:00:00`
        );

    const end =
        new Date(
            `${endDate}T00:00:00`
        );


    if (
        Number.isNaN(current.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return dates;
    }


    while (current <= end) {

        const year =
            current.getFullYear();

        const month =
            String(
                current.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                current.getDate()
            ).padStart(2, "0");


        dates.push(
            `${year}-${month}-${day}`
        );


        current.setDate(
            current.getDate() + 1
        );
    }


    return dates;
}


// ============================================================
// WEEKDAY
// ============================================================

function getDayName(
    dateString
) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    if (Number.isNaN(date.getTime())) {
        return "";
    }


    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
    );
}


// ============================================================
// GET SCHEDULED CLASS SESSIONS
// ============================================================

function getScheduledSessions() {

    const {
        start,
        end
    } = getDateRange();


    const selectedSubject =
        subjectFilter?.value || "";


    const dates =
        generateDates(
            start,
            end
        );


    const sessions = [];


    /*
     * Timetable is weekly.
     *
     * Example:
     * Monday -> NLP
     *
     * If there are four Mondays in the
     * selected range, four class sessions
     * are generated.
     */


    dates.forEach(date => {

        const weekday =
            getDayName(date);


        timetableData.forEach(
            timetable => {

                if (
                    normalize(
                        timetable.day
                    ) !==
                    normalize(
                        weekday
                    )
                ) {
                    return;
                }


                if (
                    selectedSubject &&
                    String(
                        timetable.subjectID
                    ) !==
                    String(
                        selectedSubject
                    )
                ) {
                    return;
                }


                sessions.push({

                    date,

                    timetableId:
                        timetable.id,

                    subjectId:
                        timetable.subjectID,

                    teacherUid:
                        timetable.teacherUid,

                    startTime:
                        timetable.startTime,

                    endTime:
                        timetable.endTime,

                    room:
                        timetable.room,

                    type:
                        timetable.type

                });

            }
        );
    });


    /*
     * Prevent duplicate timetable entries
     * for the same date + timetable class.
     */

    const unique =
        new Map();


    sessions.forEach(
        session => {

            const key =
                `${session.date}_${session.timetableId}`;


            if (!unique.has(key)) {

                unique.set(
                    key,
                    session
                );
            }
        }
    );


    return [...unique.values()];
}


// ============================================================
// GET TEACHER STUDENTS
// ============================================================

function getTeacherStudents() {

    /*
     * Current database does not contain a dedicated
     * enrollment collection.
     *
     * Therefore use students that have attendance
     * records for this teacher.
     *
     * If no attendance exists yet, show all active
     * students as fallback.
     */


    const studentIds =
        new Set();


    attendanceData.forEach(
        record => {

            if (record.student_id) {

                studentIds.add(
                    String(record.student_id)
                );

                return;
            }


            if (record.rfid_uid) {

                const student =
                    getStudentByRFID(
                        record.rfid_uid
                    );


                if (student) {

                    studentIds.add(
                        String(student.id)
                    );
                }
            }
        }
    );


    if (studentIds.size > 0) {

        return studentsData.filter(
            student =>
                studentIds.has(
                    String(student.id)
                )
        );
    }


    return [...studentsData];
}


// ============================================================
// MATCH ATTENDANCE TO SESSION
// ============================================================

function isAttendanceForSession(
    record,
    session
) {

    if (
        String(record.date || "") !==
        String(session.date || "")
    ) {
        return false;
    }


    if (
        String(
            record.subject_id || ""
        ) !==
        String(
            session.subjectId || ""
        )
    ) {
        return false;
    }


    return true;
}


// ============================================================
// GET STUDENT ATTENDANCE RECORDS
// ============================================================

function getStudentAttendanceRecords(
    student,
    records
) {

    const studentId =
        String(student.id);


    const studentRFID =
        normalize(
            student.rfid_uid
        );


    return records.filter(
        record => {

            if (
                String(
                    record.student_id || ""
                ) === studentId
            ) {
                return true;
            }


            if (
                studentRFID &&
                normalize(
                    record.rfid_uid
                ) === studentRFID
            ) {
                return true;
            }


            return false;
        }
    );
}


// ============================================================
// CALCULATE STUDENT REPORT
// ============================================================

function calculateStudentReport(
    student,
    sessions
) {

    const studentRecords =
        getStudentAttendanceRecords(
            student,
            attendanceData
        );


    const selectedSubject =
        subjectFilter?.value || "";


    /*
     * Only sessions selected by:
     *
     * - date range
     * - subject
     * - teacher timetable
     */

    const validSessions =
        sessions.filter(
            session => {

                if (
                    selectedSubject &&
                    String(
                        session.subjectId
                    ) !==
                    String(
                        selectedSubject
                    )
                ) {
                    return false;
                }


                return true;
            }
        );


    const totalClasses =
        validSessions.length;


    /*
     * Set of classes where student
     * has successfully scanned.
     *
     * Key:
     *
     * date + timetable/subject
     */

    const attendedSessionKeys =
        new Set();


    studentRecords.forEach(
        record => {

            const matchingSession =
                validSessions.find(
                    session =>
                        isAttendanceForSession(
                            record,
                            session
                        )
                );


            if (!matchingSession) {
                return;
            }


            const key =
                `${matchingSession.date}_${matchingSession.timetableId}`;


            attendedSessionKeys.add(
                key
            );
        }
    );


    const present =
        attendedSessionKeys.size;


    const absent =
        Math.max(
            0,
            totalClasses -
            present
        );


    const percentage =
        totalClasses > 0
            ? (
                present /
                totalClasses
            ) * 100
            : 0;


    return {

        student,

        totalClasses,

        present,

        absent,

        percentage:
            Math.round(
                clampPercentage(
                    percentage
                ) * 100
            ) / 100

    };
}


// ============================================================
// BUILD REPORTS
// ============================================================

function buildReports() {

    const sessions =
        getScheduledSessions();


    const students =
        getTeacherStudents();


    let reports =
        students.map(
            student =>
                calculateStudentReport(
                    student,
                    sessions
                )
        );


    // ========================================================
    // SEARCH
    // ========================================================

    const search =
        normalize(
            searchInput?.value || ""
        );


    if (search) {

        reports =
            reports.filter(
                report => {

                    const student =
                        report.student;


                    return (

                        normalize(
                            student.name
                        ).includes(search)

                        ||

                        normalize(
                            student.roll_no
                        ).includes(search)

                        ||

                        normalize(
                            student.email
                        ).includes(search)

                        ||

                        normalize(
                            student.rfid_uid
                        ).includes(search)

                    );
                }
            );
    }


    // ========================================================
    // STATUS FILTER
    // ========================================================

    const status =
        statusFilter?.value || "";


    if (status === "good") {

        reports =
            reports.filter(
                report =>
                    report.percentage >= 75
            );

    } else if (status === "low") {

        reports =
            reports.filter(
                report =>
                    report.percentage < 75
            );
    }


    // ========================================================
    // SORT BY ROLL NUMBER
    // ========================================================

    reports.sort(
        (a, b) =>
            String(
                a.student.roll_no || ""
            ).localeCompare(
                String(
                    b.student.roll_no || ""
                ),
                undefined,
                {
                    numeric: true
                }
            )
    );


    return {
        reports,
        sessions
    };
}


// ============================================================
// STATUS
// ============================================================

function getStatus(
    percentage
) {

    if (percentage >= 75) {

        return {

            text: "Good",

            className: "badge-good",

            progressClass: "green"

        };
    }


    return {

        text: "Low",

        className: "badge-low",

        progressClass: "red"

    };
}


// ============================================================
// RENDER TABLE
// ============================================================

function renderReports() {

    if (!reportsTableBody) {
        return;
    }


    const {
        reports,
        sessions
    } =
        buildReports();


    console.log(
        "Scheduled sessions:",
        sessions
    );


    if (reports.length === 0) {

        reportsTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:40px;
                    ">

                    No report data found.

                </td>

            </tr>

        `;


        updateStats([]);

        return;
    }


    reportsTableBody.innerHTML =
        reports.map(
            report => {

                const student =
                    report.student;


                const status =
                    getStatus(
                        report.percentage
                    );


                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                student.roll_no ||
                                "—"
                            )}
                        </td>


                        <td>

                            <strong>
                                ${escapeHTML(
                                    student.name ||
                                    "Unknown"
                                )}
                            </strong>

                        </td>


                        <td>
                            ${report.totalClasses}
                        </td>


                        <td>
                            ${report.present}
                        </td>


                        <td>
                            ${report.absent}
                        </td>


                        <td>

                            <div
                                class="attendance-bar-cell">

                                <div
                                    class="progress-bar-wrap">

                                    <div
                                        class="
                                            progress-bar-fill
                                            ${status.progressClass}
                                        "
                                        style="
                                            width:${report.percentage}%;
                                        ">
                                    </div>

                                </div>


                                <span
                                    class="att-pct-label">

                                    ${report.percentage}%

                                </span>

                            </div>

                        </td>


                        <td>

                            <span
                                class="
                                    badge
                                    ${status.className}
                                ">

                                ${status.text}

                            </span>

                        </td>

                    </tr>

                `;
            }
        ).join("");


    updateStats(
        reports
    );
}


// ============================================================
// UPDATE STATS
// ============================================================

function updateStats(
    reports
) {

    const totalStudents =
        reports.length;


    const totalPresent =
        reports.reduce(
            (
                total,
                report
            ) =>
                total +
                report.present,
            0
        );


    const totalAbsent =
        reports.reduce(
            (
                total,
                report
            ) =>
                total +
                report.absent,
            0
        );


    const totalPossible =
        totalPresent +
        totalAbsent;


    const attendanceRate =
        totalPossible > 0
            ? Math.round(
                (
                    totalPresent /
                    totalPossible
                ) * 100
            )
            : 0;


    if (totalStudentsEl) {

        totalStudentsEl.textContent =
            totalStudents;
    }


    if (totalPresentEl) {

        totalPresentEl.textContent =
            totalPresent;
    }


    if (totalAbsentEl) {

        totalAbsentEl.textContent =
            totalAbsent;
    }


    if (attendanceRateEl) {

        attendanceRateEl.textContent =
            `${attendanceRate}%`;
    }


    console.log(
        "Report statistics:",
        {
            totalStudents,
            totalPresent,
            totalAbsent,
            attendanceRate
        }
    );
}


// ============================================================
// PAGE SUBTITLE
// ============================================================

function updatePageSubtitle() {

    if (!pageSubtitle) {
        return;
    }


    const {
        start,
        end
    } =
        getDateRange();


    const subject =
        subjectFilter?.value
            ? getSubjectName(
                subjectFilter.value
            )
            : "All Subjects";


    pageSubtitle.textContent =
        `${subject} • ${formatDate(start)} to ${formatDate(end)}`;
}


// ============================================================
// REFRESH
// ============================================================

function refreshReports() {

    updatePageSubtitle();

    renderReports();
}


// ============================================================
// CSV ESCAPE
// ============================================================

function csvEscape(value) {

    const text =
        String(value ?? "");


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;
    }


    return text;
}


// ============================================================
// DOWNLOAD CSV
// ============================================================

function downloadCSV() {

    const {
        reports
    } =
        buildReports();


    if (reports.length === 0) {

        alert(
            "There is no report data to download."
        );

        return;
    }


    const {
        start,
        end
    } =
        getDateRange();


    const selectedSubject =
        subjectFilter?.value || "";


    const subjectName =
        selectedSubject
            ? getSubjectName(
                selectedSubject
            )
            : "All Subjects";


    const headers = [

        "Roll No",

        "Student Name",

        "Email",

        "RFID UID",

        "Subject",

        "Date From",

        "Date To",

        "Total Classes",

        "Present",

        "Absent",

        "Attendance %",

        "Status"

    ];


    const rows =
        reports.map(
            report => {

                const student =
                    report.student;


                const status =
                    getStatus(
                        report.percentage
                    );


                return [

                    student.roll_no || "",

                    student.name || "",

                    student.email || "",

                    student.rfid_uid || "",

                    subjectName,

                    start,

                    end,

                    report.totalClasses,

                    report.present,

                    report.absent,

                    `${report.percentage}%`,

                    status.text

                ];
            }
        );


    const csv =
        [
            headers,
            ...rows
        ]
            .map(
                row =>
                    row
                        .map(csvEscape)
                        .join(",")
            )
            .join("\r\n");


    const blob =
        new Blob(
            [
                "\uFEFF" + csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `ATTENDIX_Report_${start}_to_${end}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );
}


// ============================================================
// EVENTS
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        refreshReports
    );
}


if (startDateFilter) {

    startDateFilter.addEventListener(
        "change",
        refreshReports
    );
}


if (endDateFilter) {

    endDateFilter.addEventListener(
        "change",
        refreshReports
    );
}


if (subjectFilter) {

    subjectFilter.addEventListener(
        "change",
        refreshReports
    );
}


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        refreshReports
    );
}


if (csvDownloadBtn) {

    csvDownloadBtn.addEventListener(
        "click",
        downloadCSV
    );
}


// ============================================================
// LOADING
// ============================================================

function showLoading() {

    if (!reportsTableBody) {
        return;
    }


    reportsTableBody.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:40px;
                ">

                Loading reports...

            </td>

        </tr>

    `;
}


// ============================================================
// ERROR
// ============================================================

function showError(error) {

    console.error(
        "ATTENDIX Reports Error:",
        error
    );


    if (!reportsTableBody) {
        return;
    }


    reportsTableBody.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:40px;
                    color:#dc2626;
                ">

                Unable to load reports.

                <br><br>

                <small>
                    ${escapeHTML(
                        error?.message ||
                        "Unknown error"
                    )}
                </small>

            </td>

        </tr>

    `;
}


// ============================================================
// LOAD PAGE
// ============================================================

async function loadReportsPage(user) {

    try {

        showLoading();


        console.log(
            "===================================="
        );


        console.log(
            "ATTENDIX - Teacher Reports"
        );


        console.log(
            "Logged in:",
            user.email
        );


        // ----------------------------------------------------
        // 1. Teacher
        // ----------------------------------------------------

        await loadTeacherProfile(
            user
        );


        // ----------------------------------------------------
        // 2. Students
        // ----------------------------------------------------

        await loadStudents();


        // ----------------------------------------------------
        // 3. Subjects
        // ----------------------------------------------------

        await loadSubjects();


        // ----------------------------------------------------
        // 4. Timetable
        // ----------------------------------------------------

        await loadTimetable();


        // ----------------------------------------------------
        // 5. Attendance
        // ----------------------------------------------------

        await loadAttendance();


        // ----------------------------------------------------
        // 6. Default dates
        // ----------------------------------------------------

        if (
            startDateFilter &&
            !startDateFilter.value
        ) {

            startDateFilter.value =
                getFirstDayOfMonth();
        }


        if (
            endDateFilter &&
            !endDateFilter.value
        ) {

            endDateFilter.value =
                getTodayDate();
        }


        // ----------------------------------------------------
        // 7. Subject dropdown
        // ----------------------------------------------------

        populateSubjectFilter();


        // ----------------------------------------------------
        // 8. First render
        // ----------------------------------------------------

        refreshReports();


        console.log(
            "ATTENDIX reports loaded successfully."
        );

    } catch (error) {

        showError(
            error
        );
    }
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "../index.html";

            return;
        }


        await loadReportsPage(
            user
        );
    }
);