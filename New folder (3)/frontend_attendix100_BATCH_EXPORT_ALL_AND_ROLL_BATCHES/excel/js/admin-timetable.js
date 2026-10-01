
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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

import { db, auth } from "./firebase-config.js";

// ============================================
// DOM ELEMENTS
// ============================================

const timetableGrid = document.getElementById("timetableGrid");
const branchSelect = document.getElementById("branchSelect");
const timetableStatus = document.getElementById("timetableStatus");

const totalClasses = document.getElementById("totalClasses");
const todayClasses = document.getElementById("todayClasses");
const totalSubjects = document.getElementById("totalSubjects");
const teachersAssigned = document.getElementById("teachersAssigned");

const addClassBtn = document.getElementById("addClassBtn");

// ============================================
// DATA
// ============================================

let timetableData = [];
let subjectsMap = new Map();
let teachersMap = new Map();
let editingClassId = null;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const CLASS_OPTIONS = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year"
];

const TIME_PATTERN =
  /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

const TIMETABLE_START_HOUR = 8;
const TIMETABLE_END_HOUR = 20;
const SLOT_MINUTES = 120;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function minutesToTime(totalMinutes) {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${pad2(hours)}:${pad2(minutes)} ${period}`;
}

function getTimeSlots() {
  const slots = [];
  for (let minutes = TIMETABLE_START_HOUR * 60; minutes < TIMETABLE_END_HOUR * 60; minutes += SLOT_MINUTES) {
    slots.push({ start: minutes, end: minutes + SLOT_MINUTES, label: `${minutesToTime(minutes)} - ${minutesToTime(minutes + SLOT_MINUTES)}` });
  }
  return slots;
}


// ============================================
// STATUS
// ============================================

function showStatus(message, type = "") {
  if (!timetableStatus) return;

  timetableStatus.textContent = message;
  timetableStatus.className =
    `timetable-status ${type}`;
}

// ============================================
// HTML SECURITY HELPERS
// ============================================

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

// ============================================
// TIME HELPERS
// ============================================

function convertToMinutes(time) {
  if (!time || !TIME_PATTERN.test(time)) {
    return -1;
  }

  const [clock, period] = time.split(" ");
  let [hours, minutes] = clock.split(":").map(Number);

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function getCurrentMinutes() {
  const currentTime = new Date().toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata"
    }
  );

  const [hours, minutes] = currentTime
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function getTodayName() {
  return new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      timeZone: "Asia/Kolkata"
    }
  );
}

// ============================================
// LOAD FIRESTORE DATA
// ============================================

async function loadTimetableData() {
  try {
    showStatus("Loading timetable...", "loading");

    const timetableSnapshot = await getDocs(
      collection(db, "timetable")
    );

    timetableData = timetableSnapshot.docs
      .map(item => {
        const data = item.data();

        return {
          id: item.id,
          day: data.day || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          branch: data.branch || "",
          className: data.class || "",
          room: data.room || "",
          subjectID: data.subjectID || "",
          teacherUid: data.teacherUid || "",
          type: data.type || "Lecture",
          active: data.active !== false
        };
      })
      .filter(item => item.active);

    const subjectsSnapshot = await getDocs(
      collection(db, "subjects")
    );

    subjectsMap.clear();

    subjectsSnapshot.forEach(item => {
      const data = item.data();

      if (data.active === false) return;

      subjectsMap.set(item.id, {
        id: item.id,
        name: data.name || "Unnamed Subject",
        code: data.code || ""
      });
    });

    const teachersSnapshot = await getDocs(
      collection(db, "teachers")
    );

    teachersMap.clear();

    teachersSnapshot.forEach(item => {
      const data = item.data();

      if (data.active === false) return;

      teachersMap.set(item.id, {
        id: item.id,
        name: data.name || "Unnamed Teacher",
        email: data.email || "",
        department: data.department || ""
      });
    });

    populateBranches();
    updateStatistics();
    renderTimetable();

    showStatus("", "success");

  } catch (error) {
    console.error("Error loading timetable:", error);

    showStatus(
      "Failed to load timetable data.",
      "error"
    );
  }
}

// ============================================
// BRANCH FILTER
// ============================================

function populateBranches() {
  if (!branchSelect) return;

  const currentValue = branchSelect.value;

  const branches = [
    ...new Set(
      timetableData
        .map(item => item.branch)
        .filter(Boolean)
    )
  ].sort();

  branchSelect.innerHTML = `
    <option value="">All Branches</option>

    ${branches.map(branch => `
      <option value="${escapeAttribute(branch)}">
        ${escapeHTML(branch)}
      </option>
    `).join("")}
  `;

  if (branches.includes(currentValue)) {
    branchSelect.value = currentValue;
  }
}

function getFilteredData() {
  const branch = branchSelect?.value || "";

  return timetableData.filter(item =>
    !branch || item.branch === branch
  );
}

// ============================================
// STATISTICS
// ============================================

function updateStatistics() {
  const data = getFilteredData();

  if (totalClasses) {
    totalClasses.textContent = data.length;
  }

  if (totalSubjects) {
    totalSubjects.textContent = new Set(
      data
        .map(item => item.subjectID)
        .filter(Boolean)
    ).size;
  }

  if (teachersAssigned) {
    teachersAssigned.textContent = new Set(
      data
        .map(item => item.teacherUid)
        .filter(Boolean)
    ).size;
  }

  if (todayClasses) {
    const today = getTodayName();

    todayClasses.textContent = data.filter(
      item => item.day === today
    ).length;
  }
}

// ============================================
// RENDER TIMETABLE
// ============================================

function renderTimetable() {
  if (!timetableGrid) return;

  const data = getFilteredData();
  const slots = getTimeSlots();

  if (!data.length) {
    timetableGrid.innerHTML = `
      <div class="timetable-empty">
        <strong>No classes found</strong>
        <span>Add a class or change the branch filter.</span>
      </div>`;
    return;
  }

  const byDaySlot = new Map();
  data.forEach(item => {
    const start = convertToMinutes(item.startTime);
    const slotStart = Math.floor(start / SLOT_MINUTES) * SLOT_MINUTES;
    byDaySlot.set(`${item.day}|${slotStart}`, [...(byDaySlot.get(`${item.day}|${slotStart}`) || []), item]);
  });

  timetableGrid.innerHTML = `
    <div class="timetable-cell-grid">
      <div class="timetable-cell timetable-corner">Time</div>
      ${DAYS.slice(0, 6).map(day => `<div class="timetable-cell timetable-day-cell">${escapeHTML(day)}</div>`).join("")}
      ${slots.map(slot => `
        <div class="timetable-cell timetable-time-cell">${escapeHTML(slot.label)}</div>
        ${DAYS.slice(0, 6).map(day => {
          const classes = byDaySlot.get(`${day}|${slot.start}`) || [];
          return `<div class="timetable-cell timetable-class-cell">${classes.length ? classes.map(renderCellClass).join("") : '<span class="empty-slot">—</span>'}</div>`;
        }).join("")}
      `).join("")}
    </div>`;

  attachClassActions();
}

function renderCellClass(item) {
  const subject = subjectsMap.get(item.subjectID);
  const teacher = teachersMap.get(item.teacherUid);
  const status = getClassStatus(item);

  return `
    <div class="timetable-class" data-class-id="${escapeAttribute(item.id)}">
      <div class="timetable-class-subject">${escapeHTML(subject?.name || "Unknown Subject")}</div>
      <div class="timetable-class-meta">${escapeHTML(teacher?.name || "Unassigned")}</div>
      <div class="timetable-class-meta">${escapeHTML(item.room || "Room —")} · ${escapeHTML(item.type || "Lecture")}</div>
      <div class="timetable-class-actions">
        <button type="button" class="edit-class-btn" data-id="${escapeAttribute(item.id)}">Edit</button>
        <button type="button" class="delete-class-btn" data-id="${escapeAttribute(item.id)}">Delete</button>
      </div>
    </div>`;
}

// ============================================
// CLASS STATUS
// ============================================

function getClassStatus(item) {
  if (!item.startTime || !item.endTime) {
    return "Upcoming";
  }

  if (
    !TIME_PATTERN.test(item.startTime) ||
    !TIME_PATTERN.test(item.endTime)
  ) {
    return "Upcoming";
  }

  const today = getTodayName();

  if (item.day !== today) {
    return "Upcoming";
  }

  const currentMinutes = getCurrentMinutes();
  const startMinutes = convertToMinutes(
    item.startTime
  );
  const endMinutes = convertToMinutes(
    item.endTime
  );

  if (currentMinutes < startMinutes) {
    return "Upcoming";
  }

  if (
    currentMinutes >= startMinutes &&
    currentMinutes <= endMinutes
  ) {
    return "Ongoing";
  }

  return "Completed";
}

// ============================================
// EDIT / DELETE ACTIONS
// ============================================

function attachClassActions() {
  document
    .querySelectorAll(".edit-class-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        openClassModal(button.dataset.id);
      });
    });

  document
    .querySelectorAll(".delete-class-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteClass(button.dataset.id);
      });
    });
}

// ============================================
// ADD / EDIT MODAL
// ============================================

function openClassModal(classId = null) {
  editingClassId = classId;

  const existingClass = classId
    ? timetableData.find(item => item.id === classId)
    : null;

  document
    .getElementById("classModal")
    ?.remove();

  const modal = document.createElement("div");

  modal.className = "class-modal-overlay";
  modal.id = "classModal";

  modal.innerHTML = `
    <div class="class-modal">

      <div class="modal-header">

        <h2>
          ${existingClass ? "Edit Class" : "Add Class"}
        </h2>

        <button
          type="button"
          id="closeClassModal"
        >
          ×
        </button>

      </div>

      <form id="classForm">

        <label>
          Day

          <select id="classDay" required>
            <option value="">Select Day</option>

            ${DAYS.map(day => `
              <option
                value="${escapeAttribute(day)}"
                ${
                  existingClass?.day === day
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(day)}
              </option>
            `).join("")}

          </select>
        </label>

        <label>
          Start Time (2-hour slot)
          <select id="startTime" required>
            <option value="">Select slot</option>
            ${getTimeSlots().map(slot => `<option value="${escapeAttribute(minutesToTime(slot.start))}" ${existingClass?.startTime === minutesToTime(slot.start) ? "selected" : ""}>${escapeHTML(slot.label)}</option>`).join("")}
          </select>
        </label>

        <label>
          End Time
          <input id="endTime" value="${escapeAttribute(existingClass?.endTime || "")}" readonly required>
          <small class="time-help">Every class is fixed to a 2-hour slot.</small>
        </label>

        <label>
          Branch

          <input
            type="text"
            id="classBranch"
            value="${escapeAttribute(
              existingClass?.branch || ""
            )}"
            placeholder="AI and Data Science"
            required
          >
        </label>

        <label>
          Class

          <select id="className" required>
            <option value="">Select Class</option>

            ${CLASS_OPTIONS.map(className => `
              <option
                value="${escapeAttribute(className)}"
                ${
                  existingClass?.className === className
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(className)}
              </option>
            `).join("")}

          </select>
        </label>

        <label>
          Subject

          <select id="classSubject" required>
            <option value="">Select Subject</option>

            ${[
              ...subjectsMap.values()
            ].map(subject => `
              <option
                value="${escapeAttribute(subject.id)}"
                ${
                  existingClass?.subjectID === subject.id
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(subject.name)}
                ${
                  subject.code
                    ? `(${escapeHTML(subject.code)})`
                    : ""
                }
              </option>
            `).join("")}

          </select>
        </label>

        <label>
          Teacher

          <select id="classTeacher" required>
            <option value="">Select Teacher</option>

            ${[
              ...teachersMap.values()
            ].map(teacher => `
              <option
                value="${escapeAttribute(teacher.id)}"
                ${
                  existingClass?.teacherUid === teacher.id
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(teacher.name)}
              </option>
            `).join("")}

          </select>
        </label>

        <label>
          Room

          <input
            type="text"
            id="classRoom"
            value="${escapeAttribute(
              existingClass?.room || ""
            )}"
            placeholder="418"
          >
        </label>

        <label>
          Class Type

          <select id="classType">

            ${[
              "Lecture",
              "Lab",
              "Tutorial",
              "Practical"
            ].map(type => `
              <option
                value="${escapeAttribute(type)}"
                ${
                  (existingClass?.type || "Lecture") === type
                    ? "selected"
                    : ""
                }
              >
                ${escapeHTML(type)}
              </option>
            `).join("")}

          </select>
        </label>

        <p
          id="classFormError"
          class="form-error"
        ></p>

        <div class="modal-actions">

          <button
            type="button"
            id="cancelClassBtn"
          >
            Cancel
          </button>

          <button type="submit">
            ${
              existingClass
                ? "Update Class"
                : "Add Class"
            }
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("closeClassModal")
    .addEventListener("click", closeClassModal);

  document
    .getElementById("cancelClassBtn")
    .addEventListener("click", closeClassModal);

  document
    .getElementById("classForm")
    .addEventListener("submit", saveClass);

  const startTimeControl = document.getElementById("startTime");
  const endTimeControl = document.getElementById("endTime");
  const syncEndTime = () => {
    const start = convertToMinutes(startTimeControl?.value || "");
    if (endTimeControl && start >= 0) {
      endTimeControl.value = minutesToTime(start + SLOT_MINUTES);
    }
  };
  startTimeControl?.addEventListener("change", syncEndTime);
  syncEndTime();
}

// ============================================
// CLOSE MODAL
// ============================================

function closeClassModal() {
  document
    .getElementById("classModal")
    ?.remove();

  editingClassId = null;
}

// ============================================
// SAVE CLASS
// ============================================

async function saveClass(event) {
  event.preventDefault();

  const errorElement =
    document.getElementById("classFormError");

  const dayElement =
    document.getElementById("classDay");

  const startTimeElement =
    document.getElementById("startTime");

  const endTimeElement =
    document.getElementById("endTime");

  const branchElement =
    document.getElementById("classBranch");

  const classNameElement =
    document.getElementById("className");

  const subjectElement =
    document.getElementById("classSubject");

  const teacherElement =
    document.getElementById("classTeacher");

  const roomElement =
    document.getElementById("classRoom");

  const typeElement =
    document.getElementById("classType");

  const elements = {
    classDay: dayElement,
    startTime: startTimeElement,
    endTime: endTimeElement,
    classBranch: branchElement,
    className: classNameElement,
    classSubject: subjectElement,
    classTeacher: teacherElement,
    classRoom: roomElement,
    classType: typeElement
  };

  // Check missing elements
  for (const [id, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Missing form element: #${id}`);

      if (errorElement) {
        errorElement.textContent =
          `Form error: Missing element #${id}`;
      }

      return;
    }
  }

  const day = dayElement.value;
  const startTime = startTimeElement.value
    .trim()
    .toUpperCase();

  const endTime = endTimeElement.value
    .trim()
    .toUpperCase();

  const branch = branchElement.value.trim();
  const className = classNameElement.value;
  const subjectID = subjectElement.value;
  const teacherUid = teacherElement.value;
  const room = roomElement.value.trim();
  const type = typeElement.value;

  // Required field validation
  if (
    !day ||
    !startTime ||
    !endTime ||
    !branch ||
    !className ||
    !subjectID ||
    !teacherUid
  ) {
    errorElement.textContent =
      "Please fill in all required fields.";

    return;
  }

  // AM/PM validation
  if (
    !TIME_PATTERN.test(startTime) ||
    !TIME_PATTERN.test(endTime)
  ) {
    errorElement.textContent =
      "Use format like 09:00 AM or 02:30 PM.";

    return;
  }

  const startMinutes =
    convertToMinutes(startTime);

  const endMinutes =
    convertToMinutes(endTime);

  if (startMinutes >= endMinutes) {
    errorElement.textContent = "End time must be after start time.";
    return;
  }

  if (endMinutes - startMinutes !== SLOT_MINUTES) {
    errorElement.textContent = "Each timetable class must be exactly 2 hours.";
    return;
  }

  // Firestore data
  const classData = {
    day,
    startTime,
    endTime,
    branch,
    class: className,
    subjectID,
    teacherUid,
    room,
    type,
    active: true,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingClassId) {
      await updateDoc(
        doc(db, "timetable", editingClassId),
        classData
      );
    } else {
      await addDoc(
        collection(db, "timetable"),
        {
          ...classData,
          createdAt: serverTimestamp()
        }
      );
    }

    closeClassModal();

    await loadTimetableData();

  } catch (error) {
    console.error("Error saving class:", error);

    errorElement.textContent =
      error.code === "permission-denied"
        ? "Permission denied. Check Firestore Rules."
        : "Failed to save class. Try again.";
  }
}

// ============================================
// DELETE CLASS
// ============================================

async function deleteClass(classId) {
  const confirmed = confirm(
    "Are you sure you want to delete this class?"
  );

  if (!confirmed) return;

  try {
    await deleteDoc(
      doc(db, "timetable", classId)
    );

    await loadTimetableData();

  } catch (error) {
    console.error("Error deleting class:", error);

    alert("Failed to delete class.");
  }
}

// ============================================
// BUTTON EVENTS
// ============================================

addClassBtn?.addEventListener("click", () => {
  openClassModal();
});

branchSelect?.addEventListener("change", () => {
  updateStatistics();
  renderTimetable();
});

// ============================================
// AUTHENTICATION
// ============================================

onAuthStateChanged(auth, user => {
  if (user) {
    console.log(
      "Authenticated user:",
      user.uid
    );

    if (addClassBtn) {
      addClassBtn.disabled = false;
    }

    loadTimetableData();

  } else {
    console.error(
      "No authenticated user found."
    );

    showStatus(
      "Please log in first.",
      "error"
    );

    if (addClassBtn) {
      addClassBtn.disabled = true;
    }
  }
});