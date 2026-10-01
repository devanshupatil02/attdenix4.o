
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
  getApps,
  getApp,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",
  authDomain: "attendix-rfid-attendance.firebaseapp.com",
  projectId: "attendix-rfid-attendance",
  storageBucket: "attendix-rfid-attendance.firebasestorage.app",
  messagingSenderId: "1038365817716",
  appId: "1:1038365817716:web:a1160a5265dfb417da8a21",
  measurementId: "G-ZYCH6VZHD0"
};


// Initialize Firebase
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const db = getFirestore(app);


// Variables
let teachers = [];
let filteredTeachers = [];
let editingTeacherId = null;


// DOM elements
const tableBody = document.getElementById("teachersTableBody");
const searchInput = document.getElementById("searchInput");
const deptFilter = document.getElementById("deptFilter");
const addTeacherBtn = document.getElementById("addTeacherBtn");


// Escape HTML
function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Create modal
function createTeacherModal() {
  if (document.getElementById("teacherModal")) {
    return;
  }

  const modal = document.createElement("div");

  modal.id = "teacherModal";

  modal.innerHTML = `
    <div class="modal-overlay" id="teacherModalOverlay">

      <div class="modal-card" role="dialog" aria-modal="true">

        <div class="modal-header">

          <h2 id="teacherModalTitle">
            Add Teacher
          </h2>

          <button
            type="button"
            id="closeTeacherModal">
            ×
          </button>

        </div>

        <form id="teacherForm">

          <label>
            Teacher Name

            <input
              id="teacherName"
              type="text"
              required
            >
          </label>

          <label>
            Email

            <input
              id="teacherEmail"
              type="email"
              required
            >
          </label>

          <label>
            Department

            <input
              id="teacherDepartment"
              type="text"
              required
            >
          </label>

          <label>
            Subjects

            <input
              id="teacherSubjects"
              type="text"
              placeholder="DBMS, AI, Mathematics"
              required
            >
          </label>

          <label>
            Students

            <input
              id="teacherStudents"
              type="number"
              min="0"
              value="0"
            >
          </label>

          <label>
            Classes per Week

            <input
              id="teacherClasses"
              type="number"
              min="0"
              value="0"
            >
          </label>

          <label>
            Status

            <select id="teacherStatus">

              <option value="true">
                Active
              </option>

              <option value="false">
                Inactive
              </option>

            </select>
          </label>

          <p
            id="teacherFormError"
            class="form-error">
          </p>

          <div class="modal-actions">

            <button
              type="button"
              class="cancel-btn"
              id="cancelTeacherBtn">
              Cancel
            </button>

            <button
              type="submit"
              class="save-btn"
              id="saveTeacherBtn">
              Save Teacher
            </button>

          </div>

        </form>

      </div>

    </div>
  `;

  document.body.appendChild(modal);


  document
    .getElementById("closeTeacherModal")
    .addEventListener("click", closeTeacherModal);


  document
    .getElementById("cancelTeacherBtn")
    .addEventListener("click", closeTeacherModal);


  document
    .getElementById("teacherModalOverlay")
    .addEventListener("click", (event) => {

      if (event.target.id === "teacherModalOverlay") {
        closeTeacherModal();
      }

    });


  document
    .getElementById("teacherForm")
    .addEventListener("submit", saveTeacher);
}


// Open modal for adding
function openTeacherModal() {

  createTeacherModal();

  editingTeacherId = null;

  document.getElementById("teacherModalTitle")
    .textContent = "Add Teacher";

  document.getElementById("saveTeacherBtn")
    .textContent = "Save Teacher";

  document.getElementById("teacherForm").reset();

  document.getElementById("teacherStudents").value = 0;

  document.getElementById("teacherClasses").value = 0;

  document.getElementById("teacherStatus").value = "true";

  document.getElementById("teacherFormError")
    .textContent = "";

  document.getElementById("teacherModal")
    .style.display = "block";
}


// Open modal for editing
function openEditTeacherModal(teacherId) {

  const teacher = teachers.find(
    (item) => item.id === teacherId
  );

  if (!teacher) {
    return;
  }

  createTeacherModal();

  editingTeacherId = teacherId;

  document.getElementById("teacherModalTitle")
    .textContent = "Edit Teacher";

  document.getElementById("saveTeacherBtn")
    .textContent = "Update Teacher";


  document.getElementById("teacherName").value =
    teacher.name || "";


  document.getElementById("teacherEmail").value =
    teacher.email || "";


  document.getElementById("teacherDepartment").value =
    teacher.department || "";


  const subjects = Array.isArray(teacher.subjects)
    ? teacher.subjects.join(", ")
    : teacher.subjects || "";


  document.getElementById("teacherSubjects").value =
    subjects;


  document.getElementById("teacherStudents").value =
    teacher.students || 0;


  document.getElementById("teacherClasses").value =
    teacher.classesPerWeek || 0;


  document.getElementById("teacherStatus").value =
    teacher.active === false ? "false" : "true";


  document.getElementById("teacherFormError")
    .textContent = "";


  document.getElementById("teacherModal")
    .style.display = "block";
}


// Close modal
function closeTeacherModal() {

  const modal = document.getElementById("teacherModal");

  if (modal) {
    modal.style.display = "none";
  }

  editingTeacherId = null;
}


// Load teachers
async function loadTeachers() {

  tableBody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align:center;">
        Loading teachers...
      </td>
    </tr>
  `;


  try {

    const snapshot = await getDocs(
      collection(db, "teachers")
    );


    teachers = snapshot.docs.map((teacherDoc) => ({
      id: teacherDoc.id,
      ...teacherDoc.data()
    }));


    filteredTeachers = [...teachers];

    updateDepartments();

    updateStatistics();

    renderTeachers();


  } catch (error) {

    console.error("Error loading teachers:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="8"
            style="text-align:center;color:red;">
          Failed to load teachers.
        </td>
      </tr>
    `;

  }
}


// Update department dropdown
function updateDepartments() {

  const departments = [
    ...new Set(
      teachers
        .map((teacher) => teacher.department)
        .filter(Boolean)
    )
  ].sort();


  deptFilter.innerHTML = `
    <option value="">
      All Departments
    </option>

    ${departments
      .map(
        (department) => `
          <option value="${escapeHTML(department)}">
            ${escapeHTML(department)}
          </option>
        `
      )
      .join("")}
  `;
}


// Update statistics
function updateStatistics() {

  const activeTeachers = teachers.filter(
    (teacher) => teacher.active !== false
  );


  const subjects = new Set();


  teachers.forEach((teacher) => {

    const teacherSubjects = Array.isArray(teacher.subjects)
      ? teacher.subjects
      : String(teacher.subjects || "")
          .split(",")
          .map((subject) => subject.trim())
          .filter(Boolean);


    teacherSubjects.forEach((subject) => {
      subjects.add(subject);
    });

  });


  const departments = new Set(
    activeTeachers
      .map((teacher) => teacher.department)
      .filter(Boolean)
  );


  const classesToday = teachers.reduce(
    (total, teacher) =>
      total + Number(teacher.classesPerWeek || 0),
    0
  );


  document.getElementById("totalTeachers")
    .textContent = activeTeachers.length;


  document.getElementById("totalSubjects")
    .textContent = subjects.size;


  document.getElementById("classesToday")
    .textContent = classesToday;


  document.getElementById("departmentCount")
    .textContent = departments.size;
}


// Render teachers
function renderTeachers() {

  if (!filteredTeachers.length) {

    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;">
          No teachers found.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML = filteredTeachers
    .map((teacher, index) => {

      const subjects = Array.isArray(teacher.subjects)
        ? teacher.subjects
        : String(teacher.subjects || "")
            .split(",")
            .map((subject) => subject.trim())
            .filter(Boolean);


      const status = teacher.active !== false;


      return `
        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            <strong>
              ${escapeHTML(teacher.name || "Unnamed")}
            </strong>

            <br>

            <small>
              ${escapeHTML(teacher.email || "")}
            </small>
          </td>

          <td>
            ${escapeHTML(teacher.department || "—")}
          </td>

          <td>
            ${
              subjects.length
                ? subjects
                    .map(
                      (subject) => `
                        <span class="subject-tag">
                          ${escapeHTML(subject)}
                        </span>
                      `
                    )
                    .join(" ")
                : "—"
            }
          </td>

          <td>
            ${Number(teacher.students || 0)}
          </td>

          <td>
            ${Number(teacher.classesPerWeek || 0)}
          </td>

          <td>

            <span class="status-badge ${
              status ? "active" : "inactive"
            }">

              ${status ? "Active" : "Inactive"}

            </span>

          </td>

          <td>

            <button
              type="button"
              class="edit-teacher-btn"
              data-id="${escapeHTML(teacher.id)}">

              Edit

            </button>

            <button
              type="button"
              class="delete-teacher-btn"
              data-id="${escapeHTML(teacher.id)}">

              Delete

            </button>

          </td>

        </tr>
      `;

    })
    .join("");


  addActionListeners();
}


// Add edit and delete listeners
function addActionListeners() {

  document
    .querySelectorAll(".edit-teacher-btn")
    .forEach((button) => {

      button.addEventListener("click", () => {

        openEditTeacherModal(button.dataset.id);

      });

    });


  document
    .querySelectorAll(".delete-teacher-btn")
    .forEach((button) => {

      button.addEventListener("click", () => {

        deleteTeacher(button.dataset.id);

      });

    });

}


// Apply filters
function applyFilters() {

  const searchTerm = searchInput.value
    .trim()
    .toLowerCase();


  const department = deptFilter.value;


  filteredTeachers = teachers.filter((teacher) => {

    const name = String(teacher.name || "")
      .toLowerCase();


    const email = String(teacher.email || "")
      .toLowerCase();


    const matchesSearch =
      name.includes(searchTerm) ||
      email.includes(searchTerm);


    const matchesDepartment =
      !department ||
      teacher.department === department;


    return matchesSearch && matchesDepartment;

  });


  renderTeachers();
}


// Save or update teacher
async function saveTeacher(event) {

  event.preventDefault();


  const errorElement =
    document.getElementById("teacherFormError");


  const saveButton =
    document.getElementById("saveTeacherBtn");


  errorElement.textContent = "";

  saveButton.disabled = true;

  saveButton.textContent = editingTeacherId
    ? "Updating..."
    : "Saving...";


  const name =
    document.getElementById("teacherName")
      .value.trim();


  const email =
    document.getElementById("teacherEmail")
      .value.trim();


  const department =
    document.getElementById("teacherDepartment")
      .value.trim();


  const subjects =
    document.getElementById("teacherSubjects")
      .value
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);


  const students = Number(
    document.getElementById("teacherStudents")
      .value || 0
  );


  const classesPerWeek = Number(
    document.getElementById("teacherClasses")
      .value || 0
  );


  const active =
    document.getElementById("teacherStatus")
      .value === "true";


  const teacherData = {
    name,
    email,
    department,
    subjects,
    students,
    classesPerWeek,
    active
  };


  try {

    if (editingTeacherId) {

      await updateDoc(
        doc(db, "teachers", editingTeacherId),
        teacherData
      );

    } else {

      await addDoc(
        collection(db, "teachers"),
        {
          ...teacherData,
          createdAt: serverTimestamp()
        }
      );

    }


    closeTeacherModal();

    await loadTeachers();


  } catch (error) {

    console.error("Error saving teacher:", error);

    errorElement.textContent =
      "Unable to save teacher. Check Firestore permissions.";


  } finally {

    saveButton.disabled = false;

    saveButton.textContent = "Save Teacher";

  }

}


// Delete teacher
async function deleteTeacher(teacherId) {

  const teacher = teachers.find(
    (item) => item.id === teacherId
  );


  if (!teacher) {
    return;
  }


  const confirmed = confirm(
    `Are you sure you want to delete ${
      teacher.name || "this teacher"
    }?`
  );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(
      doc(db, "teachers", teacherId)
    );


    await loadTeachers();


  } catch (error) {

    console.error("Error deleting teacher:", error);

    alert(
      "Unable to delete teacher. Check Firestore permissions."
    );

  }

}


// Event listeners
addTeacherBtn.addEventListener(
  "click",
  openTeacherModal
);


searchInput.addEventListener(
  "input",
  applyFilters
);


deptFilter.addEventListener(
  "change",
  applyFilters
);


// Start application
loadTeachers();