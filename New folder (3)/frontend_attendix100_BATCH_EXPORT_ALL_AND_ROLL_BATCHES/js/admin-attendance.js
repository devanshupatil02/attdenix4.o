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


/* ============================================
   FIREBASE CONFIG
============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",
  authDomain: "attendix-rfid-attendance.firebaseapp.com",
  projectId: "attendix-rfid-attendance",
  storageBucket: "attendix-rfid-attendance.firebasestorage.app",
  messagingSenderId: "1038365817716",
  appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
  measurementId: "G-ZYCH6VZHD0"
};


/* ============================================
   FIREBASE
============================================ */

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getFirestore(app);


/* ============================================
   ELEMENTS
============================================ */

const totalStudents =
  document.getElementById("totalStudents");

const presentToday =
  document.getElementById("presentToday");

const absentToday =
  document.getElementById("absentToday");

const attendanceRate =
  document.getElementById("attendanceRate");

const presentRate =
  document.getElementById("presentRate");

const summaryPresent =
  document.getElementById("summaryPresent");

const summaryAbsent =
  document.getElementById("summaryAbsent");

const summaryRate =
  document.getElementById("summaryRate");

const attendanceTableBody =
  document.getElementById("attendanceTableBody");

const searchInput =
  document.getElementById("searchInput");

const dateFilter =
  document.getElementById("dateFilter");

const subjectFilter =
  document.getElementById("subjectFilter");

const statusFilter =
  document.getElementById("statusFilter");

const todayDate =
  document.getElementById("todayDate");


/* ============================================
   DATA
============================================ */

let students = [];
let attendanceRecords = [];
let subjects = new Map();
let teachers = new Map();


/* ============================================
   INITIAL DATE
============================================ */

const today = getIndiaDate();

if (dateFilter) {
  dateFilter.value = today;
}

if (todayDate) {
  todayDate.textContent = formatDisplayDate(today);
}


/* ============================================
   LOAD DATA
============================================ */

async function loadAttendanceData() {

  showLoading();

  try {

    /*
     * Load students
     */
    const studentsSnapshot =
      await getDocs(
        collection(db, "students")
      );

    students = [];

    studentsSnapshot.forEach((doc) => {

      const data = doc.data();

      if (data.active === false) {
        return;
      }

      students.push({
        id: doc.id,
        name: data.name || "Unknown Student",
        rollNo: data.roll_no || "—",
        department: data.department || "—",
        className: data.class || "—",
        email: data.email || "",
        rfidUid: data.rfid_uid || ""
      });

    });


    /*
     * Load attendance
     */
    const attendanceSnapshot =
      await getDocs(
        collection(db, "attendance")
      );

    attendanceRecords = [];

    attendanceSnapshot.forEach((doc) => {

      const data = doc.data();

      attendanceRecords.push({
        id: doc.id,

        date: data.date || "",

        rfidUid:
          data.rfid_uid || "",

        studentId:
          data.student_id || data.studentId || "",

        subjectId:
          data.subject_id || data.subjectId || data.subjectID || "",

        teacherUid:
          data.teacher_uid || "",

        time:
          data.time || ""
      });

    });


    /*
     * Load subjects
     */
    const subjectsSnapshot =
      await getDocs(
        collection(db, "subjects")
      );

    subjects.clear();

    subjectsSnapshot.forEach((doc) => {

      const data = doc.data();

      subjects.set(
        doc.id,
        {
          name: data.name || "Unknown Subject",
          code: data.code || ""
        }
      );

    });


    /*
     * Load teachers
     */
    const usersSnapshot =
      await getDocs(
        collection(db, "users")
      );

    teachers.clear();

    usersSnapshot.forEach((doc) => {

      const data = doc.data();

      if (data.role !== "teacher") {
        return;
      }

      const uid =
        data.uid || doc.id;

      teachers.set(
        uid,
        {
          name: data.name || "Unknown Teacher",
          email: data.email || ""
        }
      );

    });


    const timetableSnapshot = await getDocs(collection(db, "timetable"));
    window.__attendixTimetableRecords = timetableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.active !== false);

    populateSubjects();

    updateDashboard();

    renderAttendance();


  } catch (error) {

    console.error(
      "Attendance loading error:",
      error
    );

    showError();

  }

}


/* ============================================
   POPULATE SUBJECT FILTER
============================================ */

function populateSubjects() {

  if (!subjectFilter) {
    return;
  }

  subjectFilter.innerHTML = `
    <option value="">
      All Subjects
    </option>
  `;


  const activeSubjects =
    [...subjects.entries()]
      .sort((a, b) =>
        a[1].name.localeCompare(b[1].name)
      );


  activeSubjects.forEach(
    ([id, subject]) => {

      const option =
        document.createElement("option");

      option.value = id;

      option.textContent =
        subject.name;

      subjectFilter.appendChild(option);

    }
  );

}


/* ============================================
   GET SELECTED DATE
============================================ */

function getSelectedDate() {

  return dateFilter?.value ||
    getIndiaDate();

}


/* ============================================
   GET DATE RECORDS
============================================ */

function getDateRecords() {

  const selectedDate =
    getSelectedDate();

  return attendanceRecords.filter(
    record =>
      record.date === selectedDate
  );

}


/* ============================================
   UPDATE DASHBOARD
============================================ */

function updateDashboard() {

  const dateRecords =
    getDateRecords();


  /*
   * Total active students
   */
  const total =
    students.length;


  /*
   * Unique students who scanned
   */
  const presentStudentIds =
    new Set(
      dateRecords
        .map(record => record.studentId)
        .filter(Boolean)
    );


  const present =
    presentStudentIds.size;


  /*
   * This is a daily scan-based calculation.
   *
   * It does NOT claim subject-level attendance
   * because the current attendance schema has no
   * explicit absent records or student-subject
   * enrollment records.
   */
  const absent =
    Math.max(total - present, 0);


  const rate =
    total > 0
      ? (present / total) * 100
      : 0;


  if (totalStudents) {
    totalStudents.textContent = total;
  }

  if (presentToday) {
    presentToday.textContent = present;
  }

  if (absentToday) {
    absentToday.textContent = absent;
  }

  if (attendanceRate) {
    attendanceRate.textContent =
      `${rate.toFixed(1)}%`;
  }

  if (presentRate) {
    presentRate.textContent =
      `${rate.toFixed(1)}% attendance`;
  }

  if (summaryPresent) {
    summaryPresent.textContent = present;
  }

  if (summaryAbsent) {
    summaryAbsent.textContent = absent;
  }

  if (summaryRate) {
    summaryRate.textContent =
      `${rate.toFixed(1)}%`;
  }

}


/* ============================================
   RENDER ATTENDANCE
============================================ */

function renderAttendance() {
  if (!attendanceTableBody) return;

  const selectedDate = getSelectedDate();
  const search = searchInput?.value.toLowerCase().trim() || "";
  const selectedSubject = subjectFilter?.value || "";
  const selectedStatus = statusFilter?.value.toLowerCase().trim() || "";

  let records = attendanceRecords.filter(record => record.date === selectedDate);

  // When a subject is selected, build a complete student roster for that subject
  // from today's timetable. This shows both Present and Absent students.
  let roster = students;
  if (selectedSubject) {
    const scheduled = window.__attendixTimetableRecords || [];
    const dayName = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
    const classes = scheduled.filter(item => item.day === dayName && String(item.subjectID || "") === String(selectedSubject));
    const branches = new Set(classes.map(item => String(item.branch || "").trim().toLowerCase()).filter(Boolean));
    const years = new Set(classes.map(item => String(item.class || "").trim().toLowerCase()).filter(Boolean));
    roster = students.filter(student => {
      const branch = String(student.department || "").trim().toLowerCase();
      const year = String(student.class || "").trim().toLowerCase();
      return (!branches.size || branches.has(branch)) && (!years.size || years.has(year));
    });
  }

  const presentByStudent = new Map();
  records.forEach(record => {
    if (selectedSubject && String(record.subjectId) !== String(selectedSubject)) return;
    const key = String(record.studentId || record.rfidUid || "");
    if (key) presentByStudent.set(key, record);
  });

  let rows = roster.map(student => {
    let record = presentByStudent.get(String(student.id));
    if (!record && student.rfidUid) record = presentByStudent.get(String(student.rfidUid));
    const subject = selectedSubject ? subjects.get(selectedSubject) : (record ? subjects.get(record.subjectId) : null);
    return {
      type: record ? "present" : "absent",
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      subject: subject?.name || (selectedSubject ? "Selected Subject" : "—"),
      subjectId: selectedSubject || record?.subjectId || "",
      branch: student.department,
      scanTime: record?.time || "—",
      attendancePercent: null,
      status: record ? "Present" : "Absent"
    };
  });

  if (!selectedSubject) {
    rows = rows.filter(row => row.type === "present");
  }

  if (search) {
    rows = rows.filter(row => [row.name, row.rollNo, row.subject, row.branch].some(value => String(value || "").toLowerCase().includes(search)));
  }
  if (selectedStatus) rows = rows.filter(row => row.status.toLowerCase() === selectedStatus);

  if (!rows.length) {
    attendanceTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No attendance records found.</td></tr>`;
    return;
  }
  attendanceTableBody.innerHTML = rows.map(renderRow).join("");
}

/* ============================================
   RENDER ROW
============================================ */

function renderRow(row) {

  return `
    <tr>

      <td>
        ${escapeHTML(row.rollNo)}
      </td>


      <td>
        <strong>
          ${escapeHTML(row.name)}
        </strong>
      </td>


      <td>
        ${escapeHTML(row.subject)}
      </td>


      <td>
        ${escapeHTML(row.branch)}
      </td>


      <td>
        <span class="scan-time">
          ${escapeHTML(formatTime(row.scanTime))}
        </span>
      </td>


      <td>

        <div class="attendance-cell">

          <div class="progress-bar-wrap">

            <div
              class="progress-bar-fill"
              style="width:0%"
            ></div>

          </div>

          <span class="attendance-pct">
            —
          </span>

        </div>

      </td>


      <td>

        <span class="badge badge-present">
          Present
        </span>

      </td>

    </tr>
  `;

}


/* ============================================
   EVENT LISTENERS
============================================ */

if (searchInput) {

  searchInput.addEventListener(
    "input",
    renderAttendance
  );

}


if (dateFilter) {

  dateFilter.addEventListener(
    "change",
    () => {

      updateDashboard();
      renderAttendance();

      if (todayDate) {
        todayDate.textContent =
          formatDisplayDate(
            getSelectedDate()
          );
      }

    }
  );

}


if (subjectFilter) {

  subjectFilter.addEventListener(
    "change",
    renderAttendance
  );

}


if (statusFilter) {

  statusFilter.addEventListener(
    "change",
    renderAttendance
  );

}


/* ============================================
   TIME FORMAT
============================================ */

function formatTime(time) {

  if (!time) {
    return "—";
  }


  const parts =
    time.split(":");


  if (parts.length < 2) {
    return time;
  }


  let hours =
    Number(parts[0]);

  const minutes =
    parts[1];


  if (Number.isNaN(hours)) {
    return time;
  }


  const period =
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours % 12 || 12;


  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;

}


/* ============================================
   INDIA DATE
============================================ */

function getIndiaDate() {

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(new Date());

}


/* ============================================
   DISPLAY DATE
============================================ */

function formatDisplayDate(dateString) {

  if (!dateString) {
    return "—";
  }


  const date =
    new Date(
      `${dateString}T00:00:00`
    );


  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);

}


/* ============================================
   LOADING
============================================ */

function showLoading() {

  if (!attendanceTableBody) {
    return;
  }


  attendanceTableBody.innerHTML = `
    <tr>

      <td
        colspan="7"
        style="text-align:center;"
      >
        Loading attendance records...
      </td>

    </tr>
  `;

}


/* ============================================
   ERROR
============================================ */

function showError() {

  if (!attendanceTableBody) {
    return;
  }


  attendanceTableBody.innerHTML = `
    <tr>

      <td
        colspan="7"
        style="text-align:center; color:#dc2626;"
      >
        Failed to load attendance data.
      </td>

    </tr>
  `;

}


/* ============================================
   SECURITY
============================================ */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* ============================================
   START
============================================ */

loadAttendanceData();