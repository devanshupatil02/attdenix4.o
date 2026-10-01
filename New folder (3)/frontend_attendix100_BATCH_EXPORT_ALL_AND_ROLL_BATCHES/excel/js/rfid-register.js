
import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const studentSelect = document.getElementById("studentSelect");
const batchSelect = document.getElementById("batchSelect");
const registrationForm = document.getElementById("registrationForm");
const exportBatchBtn = document.getElementById("exportBatchBtn");
let students = [];

const statusMessage = document.getElementById("registrationStatus");

// ================= LOAD ACTIVE STUDENTS =================

async function loadStudents() {
  try {
    const studentsSnapshot = await getDocs(collection(db, "students"));
    students = studentsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(student => student.active !== false)
      .sort((a, b) => String(a.roll_no || "").localeCompare(String(b.roll_no || "")));
    renderStudentsForBatch();
  } catch (error) {
    console.error("Error loading students:", error);
    statusMessage.textContent = "Failed to load students.";
    studentSelect.innerHTML = '<option value="">Unable to load students</option>';
  }
}

function renderStudentsForBatch() {
  const batch = batchSelect?.value || "";
  studentSelect.innerHTML = batch ? '<option value="">Select a student</option>' : '<option value="">Select a batch first</option>';
  studentSelect.disabled = !batch;
  if (!batch) return;
  const filtered = students.filter(student => String(student.batch || "").toUpperCase() === batch);
  filtered.forEach(student => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = `${student.roll_no || "—"} - ${student.name || "Unknown Student"}`;
    studentSelect.appendChild(option);
  });
  if (!filtered.length) studentSelect.innerHTML = '<option value="">No students in this batch</option>';
}

batchSelect?.addEventListener("change", renderStudentsForBatch);

// ================= EXPORT ALL STUDENTS =================

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

exportBatchBtn?.addEventListener("click", () => {
  const allStudents = [...students].sort((a, b) =>
    String(a.roll_no || "").localeCompare(
      String(b.roll_no || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    )
  );

  if (!allStudents.length) {
    statusMessage.textContent = "No students found to export.";
    return;
  }

  const rows = [
    ["Roll No", "Student Name", "Email", "Class", "Batch", "Department", "RFID UID", "Active"]
  ];

  allStudents.forEach(student => {
    rows.push([
      student.roll_no || "",
      student.name || "",
      student.email || "",
      student.class || student.year || "",
      student.batch || "",
      student.department || "",
      student.rfid_uid || student.rfidUid || "",
      student.active === false ? "No" : "Yes"
    ]);
  });

  downloadCsv("ATTENDIX_All_Students.csv", rows);
  statusMessage.textContent = `Exported ${allStudents.length} student${allStudents.length === 1 ? "" : "s"}.`;
});

// ================= CREATE REGISTRATION REQUEST =================

registrationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const studentId = studentSelect.value;

  if (!studentId) {
    statusMessage.textContent =
      "Please select a student.";

    return;
  }

  const selectedOption =
    studentSelect.options[studentSelect.selectedIndex];

  const selectedStudentName =
    selectedOption.textContent;

  try {
    statusMessage.textContent =
      "Creating RFID registration request...";

    console.log(
      "Selected student ID:",
      studentId
    );

    console.log(
      "Selected student:",
      selectedStudentName
    );

    const requestData = {
      student_id: studentId,
      status: "pending",
      created_at: serverTimestamp()
    };

    const requestReference = await addDoc(
      collection(db, "registration_requests"),
      requestData
    );

    console.log(
      "Registration request created successfully."
    );

    console.log(
      "Request document ID:",
      requestReference.id
    );

    console.log(
      "Student ID:",
      studentId
    );

    statusMessage.textContent =
      "Request created. Scan RFID card using ESP32. Stay on this page until the card is scanned.";

    // Do NOT reset the form.
    // The selected student will remain visible.

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    statusMessage.textContent =
      "Failed to create registration request.";
  }
});

// ================= INITIALIZE =================

loadStudents();