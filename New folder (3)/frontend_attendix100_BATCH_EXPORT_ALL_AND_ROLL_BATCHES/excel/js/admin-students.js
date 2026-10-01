
/*
============================================
ATTENDIX – Admin Students
Firebase / Firestore
Add, Edit and Delete Students
============================================
*/

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    query,
    orderBy
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

const branchFilter =
    document.getElementById("branchFilter");

const batchFilter =
    document.getElementById("batchFilter");

const addStudentBtn =
    document.getElementById("addStudentBtn");

const importStudentsBtn =
    document.getElementById("importStudentsBtn");

const studentExcelInput =
    document.getElementById("studentExcelInput");

const downloadStudentTemplateBtn =
    document.getElementById("downloadStudentTemplateBtn");

const studentModal =
    document.getElementById("studentModal");

const closeStudentModal =
    document.getElementById("closeStudentModal");

const cancelStudentBtn =
    document.getElementById("cancelStudentBtn");

const studentForm =
    document.getElementById("studentForm");

const studentFormError =
    document.getElementById("studentFormError");

const saveStudentBtn =
    document.getElementById("saveStudentBtn");

const studentModalTitle =
    document.getElementById("studentModalTitle");

// Batch sorting controls
const sortBatchBtn = document.getElementById("sortBatchBtn");
const batchSortModal = document.getElementById("batchSortModal");
const closeBatchSortModal = document.getElementById("closeBatchSortModal");
const cancelBatchSortBtn = document.getElementById("cancelBatchSortBtn");
const batchSortForm = document.getElementById("batchSortForm");
const sortBatchName = document.getElementById("sortBatchName");
const sortStartRoll = document.getElementById("sortStartRoll");
const sortEndRoll = document.getElementById("sortEndRoll");
const batchSortStatus = document.getElementById("batchSortStatus");
const applyBatchSortBtn = document.getElementById("applyBatchSortBtn");


// ============================================
// DATA
// ============================================

let students = [];

let editingStudentId = null;


// ============================================
// FORM ELEMENTS
// ============================================

const studentNameInput =
    document.getElementById("studentName");

const studentRollNoInput =
    document.getElementById("studentRollNo");

const studentEmailInput =
    document.getElementById("studentEmail");

const studentClassInput =
    document.getElementById("studentClass");

const studentDepartmentInput =
    document.getElementById("studentDepartment");

const studentBatchInput =
    document.getElementById("studentBatch");

const studentRfidInput =
    document.getElementById("studentRfid");

const studentActiveInput =
    document.getElementById("studentActive");


// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents() {

    try {

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;">
                    Loading students...
                </td>
            </tr>
        `;

        let snapshot;

        try {

            const studentsQuery = query(
                collection(db, "students"),
                orderBy("roll_no")
            );

            snapshot = await getDocs(studentsQuery);

        } catch (error) {

            console.warn(
                "Ordered query failed. Loading without orderBy.",
                error
            );

            snapshot = await getDocs(
                collection(db, "students")
            );

        }

        students = snapshot.docs.map(studentDoc => ({
            id: studentDoc.id,
            ...studentDoc.data()
        }));

        updateStudentCount();

        renderStudents();

    } catch (error) {

        console.error(
            "Error loading students:",
            error
        );

        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="text-align:center;color:#dc2626;"
                >
                    Failed to load students.
                </td>
            </tr>
        `;

    }

}


// ============================================
// UPDATE STUDENT COUNT
// ============================================

function updateStudentCount() {

    const activeStudents =
        students.filter(student =>
            student.active !== false
        );

    if (totalStudentsEl) {

        totalStudentsEl.textContent =
            activeStudents.length;

    }

    /*
    Attendance statistics will be connected
    to the attendance collection later.
    */

    if (goodAttendanceEl) {
        goodAttendanceEl.textContent = "—";
    }

    if (lowAttendanceEl) {
        lowAttendanceEl.textContent = "—";
    }

    if (averageAttendanceEl) {
        averageAttendanceEl.textContent = "—";
    }

}


// ============================================
// RENDER STUDENTS
// ============================================

function renderStudents() {

    let filteredStudents = students.filter(student =>
        student.active !== false
    );

    const search =
        searchInput?.value
            ?.trim()
            .toLowerCase() || "";

    const selectedYear =
        yearFilter?.value
            ?.trim()
            .toLowerCase() || "";

    const selectedBranch =
        branchFilter?.value
            ?.trim()
            .toLowerCase() || "";


    // ========================================
    // SEARCH FILTER
    // ========================================

    if (search) {

        filteredStudents =
            filteredStudents.filter(student => {

                const name =
                    String(student.name || "")
                        .toLowerCase();

                const rollNo =
                    String(student.roll_no || "")
                        .toLowerCase();

                const email =
                    String(student.email || "")
                        .toLowerCase();

                const rfid =
                    String(student.rfid_uid || "")
                        .toLowerCase();

                return (
                    name.includes(search) ||
                    rollNo.includes(search) ||
                    email.includes(search) ||
                    rfid.includes(search)
                );

            });

    }


    // ========================================
    // YEAR FILTER
    // ========================================

    if (selectedYear) {

        filteredStudents =
            filteredStudents.filter(student =>
                String(student.class || "")
                    .trim()
                    .toLowerCase() === selectedYear
            );

    }


    // ========================================
    // BRANCH FILTER
    // ========================================

    if (selectedBranch) {

        filteredStudents =
            filteredStudents.filter(student =>
                String(student.department || "")
                    .trim()
                    .toLowerCase() === selectedBranch
            );

    }


    // ========================================
    // BATCH FILTER
    // ========================================

    const selectedBatch =
        batchFilter?.value?.trim().toLowerCase() || "";

    if (selectedBatch) {
        filteredStudents = filteredStudents.filter(student =>
            String(student.batch || "").trim().toLowerCase() === selectedBatch
        );
    }


    // ========================================
    // EMPTY STATE
    // ========================================

    if (filteredStudents.length === 0) {

        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="text-align:center;"
                >
                    ${
                        students.length === 0
                            ? "No students registered yet."
                            : "No students match the selected filters."
                    }
                </td>
            </tr>
        `;

        return;

    }


    // ========================================
    // STUDENT TABLE
    // ========================================

    studentsTableBody.innerHTML =
        filteredStudents.map(student => {

            const name =
                escapeHTML(student.name || "Unknown");

            const rollNo =
                escapeHTML(student.roll_no || "—");

            const department =
                escapeHTML(student.department || "—");

            const studentClass =
                escapeHTML(student.class || "—");


            return `
                <tr>

                    <td>
                        ${rollNo}
                    </td>

                    <td>
                        <strong>
                            ${name}
                        </strong>
                    </td>

                    <td>
                        ${department}
                    </td>

                    <td>
                        ${studentClass}
                    </td>

                    <td>
                        <span class="batch-badge">${escapeHTML(student.batch || "—")}</span>
                    </td>

                    <td>
                        <span
                            style="
                                color:#6b7280;
                                font-size:13px;
                            "
                        >
                            —
                        </span>
                    </td>

                    <td>
                        <span
                            style="
                                color:#6b7280;
                                font-size:13px;
                            "
                        >
                            —
                        </span>
                    </td>

                    <td>
                        <span class="badge badge-good">
                            Active
                        </span>
                    </td>

                    <td>
                        <div
                            style="
                                display:flex;
                                gap:6px;
                                flex-wrap:wrap;
                            "
                        >

                            <button
                                type="button"
                                class="btn btn-secondary btn-sm edit-student-btn"
                                data-id="${student.id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="btn btn-danger btn-sm delete-student-btn"
                                data-id="${student.id}"
                            >
                                Delete
                            </button>

                        </div>
                    </td>

                </tr>
            `;

        }).join("");

}


// ============================================
// OPEN ADD MODAL
// ============================================

function openAddStudentModal() {

    editingStudentId = null;

    studentForm.reset();

    if (studentActiveInput) {
        studentActiveInput.checked = true;
    }

    if (studentModalTitle) {
        studentModalTitle.textContent = "Add Student";
    }

    if (saveStudentBtn) {
        saveStudentBtn.textContent = "Add Student";
    }

    openStudentModal();

}


// ============================================
// OPEN MODAL
// ============================================

function openStudentModal() {

    if (!studentModal) return;

    studentModal.hidden = false;

    document.body.style.overflow = "hidden";

    clearFormError();

    setTimeout(() => {

        studentNameInput?.focus();

    }, 50);

}


// ============================================
// CLOSE MODAL
// ============================================

function closeModal() {

    if (!studentModal) return;

    studentModal.hidden = true;

    document.body.style.overflow = "";

    clearFormError();

    editingStudentId = null;

    if (studentModalTitle) {
        studentModalTitle.textContent = "Add Student";
    }

    if (saveStudentBtn) {
        saveStudentBtn.textContent = "Add Student";
    }

}


// ============================================
// CLEAR FORM ERROR
// ============================================

function clearFormError() {

    if (!studentFormError) return;

    studentFormError.textContent = "";

    studentFormError.hidden = true;

}


// ============================================
// SHOW FORM ERROR
// ============================================

function showFormError(message) {

    if (!studentFormError) return;

    studentFormError.textContent = message;

    studentFormError.hidden = false;

}


// ============================================
// GET FORM DATA
// ============================================

function getStudentFormData() {

    const name =
        studentNameInput?.value.trim() || "";

    const rollNo =
        studentRollNoInput?.value.trim() || "";

    const email =
        studentEmailInput?.value.trim() || "";

    const studentClass =
        studentClassInput?.value.trim() || "";

    const department =
        studentDepartmentInput?.value.trim() || "";

    const batch =
        studentBatchInput?.value.trim().toUpperCase() || "";

    const rfidUid =
        studentRfidInput?.value.trim() || "";

    const active =
        studentActiveInput?.checked ?? true;


    const normalizedRfid =
        rfidUid
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();


    return {
        name,
        rollNo,
        email,
        studentClass,
        department,
        batch,
        normalizedRfid,
        active
    };

}


// ============================================
// VALIDATE STUDENT DATA
// ============================================

function validateStudentData(data) {

    const {
        name,
        rollNo,
        email,
        studentClass,
        department,
        batch,
        normalizedRfid
    } = data;


    if (
        !name ||
        !rollNo ||
        !email ||
        !studentClass ||
        !department ||
        !batch ||
        !normalizedRfid
    ) {

        showFormError(
            "Please fill in all required fields."
        );

        return false;

    }


    // ========================================
    // DUPLICATE ROLL NUMBER
    // ========================================

    const duplicateRoll =
        students.some(student => {

            if (student.id === editingStudentId) {
                return false;
            }

            return String(student.roll_no || "")
                .trim()
                .toLowerCase() === rollNo.toLowerCase();

        });


    if (duplicateRoll) {

        showFormError(
            "A student with this roll number already exists."
        );

        return false;

    }


    // ========================================
    // DUPLICATE RFID
    // ========================================

    const duplicateRfid =
        students.some(student => {

            if (student.id === editingStudentId) {
                return false;
            }

            return String(student.rfid_uid || "")
                .trim()
                .toUpperCase() === normalizedRfid;

        });


    if (duplicateRfid) {

        showFormError(
            "This RFID UID is already registered."
        );

        return false;

    }


    return true;

}


// ============================================
// SAVE STUDENT
// ============================================

async function saveStudent(event) {

    event.preventDefault();

    clearFormError();

    const data = getStudentFormData();

    if (!validateStudentData(data)) {
        return;
    }


    const studentData = {

        active: data.active,

        class: data.studentClass,

        batch: data.batch,

        department: data.department,

        email: data.email,

        name: data.name,

        rfid_uid: data.normalizedRfid,

        roll_no: data.rollNo

    };


    const isEditing =
        Boolean(editingStudentId);


    const originalButtonText =
        saveStudentBtn?.textContent ||
        "Save";


    if (saveStudentBtn) {

        saveStudentBtn.disabled = true;

        saveStudentBtn.textContent =
            isEditing
                ? "Updating..."
                : "Adding...";

    }


    try {

        if (isEditing) {

            await updateDoc(
                doc(db, "students", editingStudentId),
                studentData
            );

        } else {

            await addDoc(
                collection(db, "students"),
                studentData
            );

        }


        studentForm.reset();

        if (studentActiveInput) {
            studentActiveInput.checked = true;
        }

        editingStudentId = null;

        closeModal();

        await loadStudents();


    } catch (error) {

        console.error(
            "Error saving student:",
            error
        );


        let message =
            isEditing
                ? "Failed to update student. Please try again."
                : "Failed to add student. Please try again.";


        if (error.code === "permission-denied") {

            message =
                "Permission denied. Check your Firestore security rules.";

        }


        showFormError(message);


    } finally {

        if (saveStudentBtn) {

            saveStudentBtn.disabled = false;

            saveStudentBtn.textContent =
                originalButtonText;

        }

    }

}


// ============================================
// BULK STUDENT IMPORT (EXCEL / CSV)
// ============================================

function normalizeImportHeader(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}

function getImportValue(row, aliases) {
    const entries = Object.entries(row);
    for (const alias of aliases) {
        const target = normalizeImportHeader(alias);
        const found = entries.find(([key]) => normalizeImportHeader(key) === target);
        if (found && found[1] !== undefined && found[1] !== null) {
            return String(found[1]).trim();
        }
    }
    return "";
}

function normalizeBatch(value) {
    const v = String(value || "").trim().toUpperCase();
    if (!v) return "";
    const match = v.match(/(?:BATCH\s*)?([1-9][0-9]*)$/i);
    return match ? `B${match[1]}` : v;
}

function normalizeActive(value) {
    if (value === undefined || value === null || String(value).trim() === "") return true;
    return !["false", "0", "no", "inactive", "disabled"].includes(String(value).trim().toLowerCase());
}

function buildStudentFromImportRow(row) {
    const name = getImportValue(row, ["name", "student name", "student_name", "student"]);
    const rollNo = getImportValue(row, ["roll_no", "roll no", "roll number", "rollnumber", "roll"]);
    const email = getImportValue(row, ["email", "email id", "email_id"]);
    const studentClass = getImportValue(row, ["class", "year", "class/year", "academic year"]);
    const department = getImportValue(row, ["department", "branch", "dept"]);
    const batch = normalizeBatch(getImportValue(row, ["batch", "batch name", "division"]));
    const rfid = getImportValue(row, ["rfid_uid", "rfid uid", "rfid", "uid"])
        .replace(/\s+/g, " ").trim().toUpperCase();
    const active = normalizeActive(getImportValue(row, ["active", "status"]));

    return {
        name,
        roll_no: rollNo,
        email,
        class: studentClass,
        department,
        batch,
        rfid_uid: rfid,
        active
    };
}

function validateImportedStudent(student, index, seenRolls, seenRfids) {
    if (!student.name || !student.roll_no || !student.class || !student.department || !student.batch) {
        return `Row ${index}: name, roll_no, class/year, department/branch and batch are required.`;
    }

    const rollKey = student.roll_no.toLowerCase();
    if (seenRolls.has(rollKey) || students.some(s => String(s.roll_no || "").trim().toLowerCase() === rollKey)) {
        return `Row ${index}: duplicate roll number ${student.roll_no}.`;
    }
    seenRolls.add(rollKey);

    if (student.rfid_uid) {
        if (seenRfids.has(student.rfid_uid) || students.some(s => String(s.rfid_uid || "").trim().toUpperCase() === student.rfid_uid)) {
            return `Row ${index}: duplicate RFID UID ${student.rfid_uid}.`;
        }
        seenRfids.add(student.rfid_uid);
    }

    return "";
}

async function importStudentsFromExcel(file) {
    if (!file) return;

    if (!window.XLSX) {
        window.alert("Excel importer is not loaded. Please refresh the page and try again.");
        return;
    }

    const originalText = importStudentsBtn?.textContent || "Import Excel";
    if (importStudentsBtn) {
        importStudentsBtn.disabled = true;
        importStudentsBtn.textContent = "Importing...";
    }

    try {
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (!rows.length) {
            throw new Error("The Excel sheet is empty.");
        }

        const imported = [];
        const seenRolls = new Set();
        const seenRfids = new Set();
        const errors = [];

        rows.forEach((row, i) => {
            const student = buildStudentFromImportRow(row);
            const error = validateImportedStudent(student, i + 2, seenRolls, seenRfids);
            if (error) errors.push(error);
            else imported.push(student);
        });

        if (errors.length) {
            throw new Error(errors.slice(0, 8).join("\n") + (errors.length > 8 ? `\n...and ${errors.length - 8} more errors.` : ""));
        }

        if (!imported.length) {
            throw new Error("No valid student rows were found.");
        }

        const batch = writeBatch(db);
        imported.forEach(student => {
            const studentRef = doc(collection(db, "students"));
            batch.set(studentRef, student);
        });

        await batch.commit();
        await loadStudents();

        window.alert(`Successfully imported ${imported.length} students.\n\nRFID UID can be left blank and registered later from the RFID Registration page.`);
    } catch (error) {
        console.error("Excel import failed:", error);
        window.alert(error.message || "Failed to import students.");
    } finally {
        if (importStudentsBtn) {
            importStudentsBtn.disabled = false;
            importStudentsBtn.textContent = originalText;
        }
        if (studentExcelInput) studentExcelInput.value = "";
    }
}

function downloadStudentTemplate() {
    if (!window.XLSX) return;

    const template = [{
        name: "Rahul Patil",
        roll_no: "01",
        email: "rahul@example.com",
        class: "Second Year",
        batch: "B1",
        department: "AI and Data Science",
        rfid_uid: "",
        active: true
    }];

    const worksheet = window.XLSX.utils.json_to_sheet(template);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    window.XLSX.writeFile(workbook, "ATTENDIX_Student_Import_Template.xlsx");
}


// ============================================
// EDIT STUDENT
// ============================================

function editStudent(studentId) {

    const student =
        students.find(student =>
            student.id === studentId
        );


    if (!student) return;


    editingStudentId = studentId;


    if (studentModalTitle) {
        studentModalTitle.textContent = "Edit Student";
    }

    if (saveStudentBtn) {
        saveStudentBtn.textContent = "Update Student";
    }


    studentNameInput.value =
        student.name || "";

    studentRollNoInput.value =
        student.roll_no || "";

    studentEmailInput.value =
        student.email || "";

    studentClassInput.value =
        student.class || "";

    studentDepartmentInput.value =
        student.department || "";

    if (studentBatchInput) {
        studentBatchInput.value = student.batch || "";
    }

    studentRfidInput.value =
        student.rfid_uid || "";

    studentActiveInput.checked =
        student.active !== false;


    openStudentModal();

}


// ============================================
// DELETE STUDENT
// ============================================

async function deleteStudent(studentId) {

    const student =
        students.find(student =>
            student.id === studentId
        );


    if (!student) return;


    const confirmed =
        window.confirm(
            `Are you sure you want to permanently delete ${
                student.name || "this student"
            }?`
        );


    if (!confirmed) return;


    try {

        await deleteDoc(
            doc(db, "students", studentId)
        );


        await loadStudents();


        window.alert(
            "Student deleted successfully."
        );


    } catch (error) {

        console.error(
            "Error deleting student:",
            error
        );


        if (error.code === "permission-denied") {

            window.alert(
                "Permission denied. Check your Firestore security rules."
            );

        } else {

            window.alert(
                "Failed to delete student. Please try again."
            );

        }

    }

}


// ============================================
// ESCAPE HTML
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
// BATCH SORTING BY ROLL NUMBER
// ============================================

function openBatchSortModal() {
    if (!batchSortModal) return;
    batchSortModal.hidden = false;
    batchSortModal.setAttribute("aria-hidden", "false");
    if (batchSortStatus) batchSortStatus.textContent = "";
    sortStartRoll?.focus();
}

function closeBatchSort() {
    if (!batchSortModal) return;
    batchSortModal.hidden = true;
    batchSortModal.setAttribute("aria-hidden", "true");
}

function numericRoll(value) {
    const match = String(value ?? "").match(/\d+/);
    return match ? Number(match[0]) : NaN;
}

async function assignBatchByRollRange(event) {
    event.preventDefault();

    const batch = String(sortBatchName?.value || "").trim().toUpperCase();
    const start = Number(sortStartRoll?.value);
    const end = Number(sortEndRoll?.value);

    if (!batch || !Number.isFinite(start) || !Number.isFinite(end) || start > end) {
        if (batchSortStatus) batchSortStatus.textContent = "Enter a valid roll-number range.";
        return;
    }

    const matching = students.filter(student => {
        const roll = numericRoll(student.roll_no);
        return Number.isFinite(roll) && roll >= start && roll <= end;
    });

    if (!matching.length) {
        if (batchSortStatus) batchSortStatus.textContent = `No students found with roll numbers ${start}–${end}.`;
        return;
    }

    try {
        if (applyBatchSortBtn) {
            applyBatchSortBtn.disabled = true;
            applyBatchSortBtn.textContent = "Updating...";
        }
        if (batchSortStatus) batchSortStatus.textContent = `Assigning ${matching.length} students to ${batch}...`;

        const batchWriter = writeBatch(db);
        matching.forEach(student => {
            batchWriter.update(doc(db, "students", student.id), {
                batch,
                updated_at: new Date()
            });
        });
        await batchWriter.commit();

        matching.forEach(student => { student.batch = batch; });
        renderStudents();
        if (batchSortStatus) batchSortStatus.textContent = `Done — ${matching.length} students with roll numbers ${start}–${end} are now in ${batch}.`;
    } catch (error) {
        console.error("Batch assignment error:", error);
        if (batchSortStatus) batchSortStatus.textContent = "Failed to update batches. Check Firestore permissions.";
    } finally {
        if (applyBatchSortBtn) {
            applyBatchSortBtn.disabled = false;
            applyBatchSortBtn.textContent = "Apply Batch";
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Sort students into batches by roll-number range
sortBatchBtn?.addEventListener("click", openBatchSortModal);
closeBatchSortModal?.addEventListener("click", closeBatchSort);
cancelBatchSortBtn?.addEventListener("click", closeBatchSort);
batchSortModal?.addEventListener("click", event => {
    if (event.target === batchSortModal) closeBatchSort();
});
batchSortForm?.addEventListener("submit", assignBatchByRollRange);

// Add student

addStudentBtn?.addEventListener(
    "click",
    openAddStudentModal
);


// Import Excel / CSV

importStudentsBtn?.addEventListener(
    "click",
    () => studentExcelInput?.click()
);

studentExcelInput?.addEventListener(
    "change",
    event => importStudentsFromExcel(event.target.files?.[0])
);

downloadStudentTemplateBtn?.addEventListener(
    "click",
    downloadStudentTemplate
);


// Close modal

closeStudentModal?.addEventListener(
    "click",
    closeModal
);


// Cancel modal

cancelStudentBtn?.addEventListener(
    "click",
    closeModal
);


// Form submit

studentForm?.addEventListener(
    "submit",
    saveStudent
);


// Search

searchInput?.addEventListener(
    "input",
    renderStudents
);


// Year filter

yearFilter?.addEventListener(
    "change",
    renderStudents
);


// Branch filter

branchFilter?.addEventListener(
    "change",
    renderStudents
);

batchFilter?.addEventListener(
    "change",
    renderStudents
);


// Edit and Delete buttons

studentsTableBody?.addEventListener(
    "click",
    event => {

        const editButton =
            event.target.closest(".edit-student-btn");

        const deleteButton =
            event.target.closest(".delete-student-btn");


        if (editButton) {

            editStudent(
                editButton.dataset.id
            );

        }


        if (deleteButton) {

            deleteStudent(
                deleteButton.dataset.id
            );

        }

    }
);


// Close when clicking outside

studentModal?.addEventListener(
    "click",
    event => {

        if (event.target === studentModal) {

            closeModal();

        }

    }
);


// Close using Escape key

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            studentModal &&
            !studentModal.hidden
        ) {

            closeModal();

        }

    }
);


// ============================================
// INITIAL LOAD
// ============================================

loadStudents();