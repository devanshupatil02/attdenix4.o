// ============================================
// ATTENDIX – Admin Reports
// Firebase / Firestore
// ============================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",
  authDomain: "attendix-rfid-attendance.firebaseapp.com",
  projectId: "attendix-rfid-attendance",
  storageBucket: "attendix-rfid-attendance.firebasestorage.app",
  messagingSenderId: "1038365817716",
  appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
  measurementId: "G-ZYCH6VZHD0"
};


// ============================================
// INITIALIZE FIREBASE
// ============================================

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getFirestore(app);


// ============================================
// ELEMENTS
// ============================================

const totalStudentsEl = document.getElementById("totalStudents");
const goodAttendanceEl = document.getElementById("goodAttendance");
const lowAttendanceEl = document.getElementById("lowAttendance");
const averageAttendanceEl = document.getElementById("averageAttendance");

const reportsTableBody =
  document.getElementById("reportsTableBody");

const searchInput =
  document.getElementById("searchInput");

const startDateInput =
  document.getElementById("startDate");

const endDateInput =
  document.getElementById("endDate");

const subjectFilter =
  document.getElementById("subjectFilter");

const statusFilter =
  document.getElementById("statusFilter");


// ============================================
// DATA
// ============================================

let students = [];
let attendanceRecords = [];
let subjects = [];
let timetableRecords = [];


// ============================================
// INDIA DATE
// ============================================

function getIndiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata"
  }).format(new Date());
}


// ============================================
// DATE HELPERS
// ============================================

function getMonthStart(dateString) {
  if (!dateString) return "";

  return `${dateString.slice(0, 7)}-01`;
}


function getDateRange(startDate, endDate) {
  const dates = [];

  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(
      current.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      current.getDate()
    ).padStart(2, "0");

    dates.push(`${year}-${month}-${day}`);

    current.setDate(current.getDate() + 1);
  }

  return dates;
}


// ============================================
// DAY NAME
// ============================================

function getDayName(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "long"
  });
}


// ============================================
// LOAD FIRESTORE DATA
// ============================================

async function loadReportData() {

  try {

    reportsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">
          Loading attendance reports...
        </td>
      </tr>
    `;


    // ------------------------------
    // STUDENTS
    // ------------------------------

    const studentsSnapshot =
      await getDocs(
        collection(db, "students")
      );

    students = studentsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(student => student.active !== false);


    // ------------------------------
    // ATTENDANCE
    // ------------------------------

    const attendanceSnapshot =
      await getDocs(
        collection(db, "attendance")
      );

    attendanceRecords =
      attendanceSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          student_id: data.student_id || data.studentId || "",
          subject_id: data.subject_id || data.subjectId || data.subjectID || ""
        };
      });


    // ------------------------------
    // SUBJECTS
    // ------------------------------

    const subjectsSnapshot =
      await getDocs(
        collection(db, "subjects")
      );

    subjects = subjectsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(subject => subject.active !== false);


    // ------------------------------
    // TIMETABLE
    // ------------------------------

    const timetableSnapshot =
      await getDocs(
        collection(db, "timetable")
      );

    timetableRecords =
      timetableSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(item => item.active !== false);


    // ------------------------------
    // SUBJECT FILTER
    // ------------------------------

    populateSubjectFilter();


    // ------------------------------
    // DEFAULT DATES
    // ------------------------------

    const today = getIndiaDate();

    if (!startDateInput.value) {
      startDateInput.value =
        getMonthStart(today);
    }

    if (!endDateInput.value) {
      endDateInput.value = today;
    }


    // ------------------------------
    // RENDER REPORT
    // ------------------------------

    renderReports();

  } catch (error) {

    console.error(
      "Error loading report data:",
      error
    );

    reportsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#dc2626;">
          Failed to load attendance reports.
        </td>
      </tr>
    `;
  }
}


// ============================================
// SUBJECT FILTER
// ============================================

function populateSubjectFilter() {

  if (!subjectFilter) return;

  subjectFilter.innerHTML = `
    <option value="">All Subjects</option>
  `;

  subjects
    .sort((a, b) =>
      String(a.name || "").localeCompare(
        String(b.name || "")
      )
    )
    .forEach(subject => {

      const option =
        document.createElement("option");

      option.value = subject.id;

      option.textContent =
        subject.code
          ? `${subject.name} (${subject.code})`
          : subject.name || "Unnamed Subject";

      subjectFilter.appendChild(option);
    });
}


// ============================================
// GET SCHEDULED CLASSES
// ============================================

function getScheduledClasses(
  startDate,
  endDate,
  selectedSubjectId = ""
) {

  const dates =
    getDateRange(startDate, endDate);

  const scheduledClasses = [];

  dates.forEach(date => {

    const dayName =
      getDayName(date);


    timetableRecords.forEach(item => {

      if (item.day !== dayName) {
        return;
      }


      if (
        selectedSubjectId &&
        item.subjectID !== selectedSubjectId
      ) {
        return;
      }


      scheduledClasses.push({
        date,
        subjectID: item.subjectID || "",
        teacherUid: item.teacherUid || "",
        startTime: item.startTime || "",
        endTime: item.endTime || "",
        room: item.room || ""
      });

    });

  });


  return scheduledClasses;
}


// ============================================
// GET STUDENT REPORT
// ============================================

function calculateStudentReport(student, startDate, endDate, selectedSubjectId) {
  const scheduledClasses = getScheduledClassesForStudent(student, startDate, endDate, selectedSubjectId);

  const studentAttendance = attendanceRecords.filter(record => {
    if (String(record.student_id || "") !== String(student.id)) return false;
    if (!record.date || record.date < startDate || record.date > endDate) return false;
    if (selectedSubjectId && String(record.subject_id || "") !== String(selectedSubjectId)) return false;
    return true;
  });

  const uniqueAttendance = new Map();
  studentAttendance.forEach(record => {
    const key = `${record.date}_${record.subject_id || ""}`;
    if (!uniqueAttendance.has(key)) uniqueAttendance.set(key, record);
  });

  const present = Math.min(uniqueAttendance.size, scheduledClasses.length);
  const totalClasses = scheduledClasses.length;
  const absent = Math.max(totalClasses - present, 0);
  const percentage = totalClasses ? (present / totalClasses) * 100 : 0;

  return {
    student, totalClasses, present, absent, percentage,
    status: percentage >= 75 ? "good" : "low"
  };
}

function getScheduledClassesForStudent(student, startDate, endDate, selectedSubjectId = "") {
  const dates = getDateRange(startDate, endDate);
  const studentBranch = String(student.department || student.branch || "").trim().toLowerCase();
  const studentYear = String(student.class || student.year || "").trim().toLowerCase();
  const result = [];

  dates.forEach(date => {
    const dayName = getDayName(date);
    timetableRecords.forEach(item => {
      if (item.day !== dayName) return;
      if (selectedSubjectId && String(item.subjectID || "") !== String(selectedSubjectId)) return;
      const itemBranch = String(item.branch || "").trim().toLowerCase();
      const itemYear = String(item.class || "").trim().toLowerCase();
      if (itemBranch && studentBranch && itemBranch !== studentBranch) return;
      if (itemYear && studentYear && itemYear !== studentYear) return;
      result.push({ ...item, date });
    });
  });
  return result;
}

// ============================================
// RENDER REPORTS
// ============================================

function renderReports() {

  if (!reportsTableBody) return;


  const startDate =
    startDateInput.value;

  const endDate =
    endDateInput.value;

  const selectedSubjectId =
    subjectFilter.value;

  const selectedStatus =
    statusFilter.value;

  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  // ------------------------------
  // Validate dates
  // ------------------------------

  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {

    reportsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#dc2626;">
          Start date cannot be after end date.
        </td>
      </tr>
    `;

    return;
  }


  // ------------------------------
  // Calculate reports
  // ------------------------------

  let reports =
    students.map(student =>
      calculateStudentReport(
        student,
        startDate,
        endDate,
        selectedSubjectId
      )
    );


  // ------------------------------
  // Search
  // ------------------------------

  if (search) {

    reports =
      reports.filter(report => {

        const name =
          String(
            report.student.name || ""
          ).toLowerCase();

        const rollNo =
          String(
            report.student.roll_no || ""
          ).toLowerCase();

        const email =
          String(
            report.student.email || ""
          ).toLowerCase();

        return (
          name.includes(search) ||
          rollNo.includes(search) ||
          email.includes(search)
        );

      });

  }


  // ------------------------------
  // Status filter
  // ------------------------------

  if (selectedStatus) {

    reports =
      reports.filter(
        report =>
          report.status === selectedStatus
      );

  }


  // ------------------------------
  // Sort by roll number
  // ------------------------------

  reports.sort((a, b) => {

    const rollA =
      String(
        a.student.roll_no || ""
      );

    const rollB =
      String(
        b.student.roll_no || ""
      );

    return rollA.localeCompare(
      rollB,
      undefined,
      { numeric: true }
    );

  });


  // ------------------------------
  // Update statistics
  // ------------------------------

  updateStatistics(reports);


  // ------------------------------
  // Render table
  // ------------------------------

  renderTable(reports);

}


// ============================================
// UPDATE STATISTICS
// ============================================

function updateStatistics(reports) {

  const totalStudents =
    students.length;


  const validReports =
    students.map(student =>
      calculateStudentReport(
        student,
        startDateInput.value,
        endDateInput.value,
        subjectFilter.value
      )
    );


  const reportsWithClasses =
    validReports.filter(
      report =>
        report.totalClasses > 0
    );


  const goodAttendance =
    reportsWithClasses.filter(
      report =>
        report.percentage >= 75
    ).length;


  const lowAttendance =
    reportsWithClasses.filter(
      report =>
        report.percentage < 75
    ).length;


  let averageAttendance = 0;


  if (reportsWithClasses.length > 0) {

    const totalPercentage =
      reportsWithClasses.reduce(
        (sum, report) =>
          sum + report.percentage,
        0
      );

    averageAttendance =
      totalPercentage /
      reportsWithClasses.length;

  }


  totalStudentsEl.textContent =
    totalStudents;


  goodAttendanceEl.textContent =
    goodAttendance;


  lowAttendanceEl.textContent =
    lowAttendance;


  averageAttendanceEl.textContent =
    `${averageAttendance.toFixed(1)}%`;
}


// ============================================
// RENDER TABLE
// ============================================

function renderTable(reports) {

  if (reports.length === 0) {

    reportsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">
          No attendance records found.
        </td>
      </tr>
    `;

    return;
  }


  reportsTableBody.innerHTML =
    reports.map(report => {

      const student =
        report.student;


      const percentage =
        report.percentage;


      const percentageText =
        report.totalClasses > 0
          ? `${percentage.toFixed(1)}%`
          : "—";


      const badgeClass =
        report.status === "good"
          ? "badge-good"
          : "badge-low";


      const badgeText =
        report.status === "good"
          ? "Good"
          : "Low";


      let progressClass = "red";


      if (percentage >= 75) {
        progressClass = "green";
      } else if (percentage >= 60) {
        progressClass = "orange";
      }


      const progressWidth =
        Math.min(
          Math.max(percentage, 0),
          100
        );


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
                student.name || "Unknown Student"
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

            <div class="attendance-bar-cell">

              <div class="progress-bar-wrap">

                <div
                  class="progress-bar-fill ${progressClass}"
                  style="width:${progressWidth}%"
                ></div>

              </div>

              <span class="att-pct-label">
                ${percentageText}
              </span>

            </div>

          </td>


          <td>

            <span class="badge ${badgeClass}">
              ${report.totalClasses > 0
                ? badgeText
                : "No Data"}
            </span>

          </td>

        </tr>
      `;

    }).join("");
}


// ============================================
// HTML ESCAPE
// ============================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================
// FILTER EVENTS
// ============================================

searchInput?.addEventListener(
  "input",
  renderReports
);


startDateInput?.addEventListener(
  "change",
  renderReports
);


endDateInput?.addEventListener(
  "change",
  renderReports
);


subjectFilter?.addEventListener(
  "change",
  renderReports
);


statusFilter?.addEventListener(
  "change",
  renderReports
);


// ============================================
// INITIAL LOAD
// ============================================

loadReportData();