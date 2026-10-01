// ============================================================
// ATTENDIX - TEACHER TIMETABLE
// Firebase Dynamic Timetable
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
    getDocs,
    doc,
    updateDoc,
    deleteDoc
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
// FIREBASE INITIALIZATION
// ============================================================

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// GLOBAL DATA
// ============================================================

let timetableData = [];
let subjectsData = [];
let attendanceData = [];
let teachersData = [];

let currentTeacherIds = [];


// ============================================================
// ELEMENTS
// ============================================================

const timetableGrid =
    document.getElementById("timetableGrid");

const todayClassesEl =
    document.getElementById("todayClasses");

const completedClassesEl =
    document.getElementById("completedClasses");

const upcomingClassesEl =
    document.getElementById("upcomingClasses");

const totalSubjectsEl =
    document.getElementById("totalSubjects");

const pageSubtitle =
    document.getElementById("pageSubtitle");

const scheduleSubtitle =
    document.getElementById("scheduleSubtitle");


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


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(time) {

    if (!time) {
        return "—";
    }

    const parts =
        String(time).split(":");

    if (parts.length < 2) {
        return time;
    }

    let hour =
        Number(parts[0]);

    const minute =
        parts[1];

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;

}


// ============================================================
// TIME TO MINUTES
// ============================================================

function timeToMinutes(time) {

    if (!time) {
        return 0;
    }

    const parts =
        String(time).split(":");

    return (
        Number(parts[0]) * 60 +
        Number(parts[1] || 0)
    );

}


// ============================================================
// CURRENT DAY
// ============================================================

function getCurrentDay() {

    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    return days[
        new Date().getDay()
    ];

}


// ============================================================
// GET SUBJECT
// ============================================================

function getSubject(subjectId) {

    return subjectsData.find(
        subject =>
            subject.id === subjectId
    );

}


// ============================================================
// CLASS STATUS
// ============================================================

function getClassStatus(item) {

    const today =
        getCurrentDay();


    // Different day = upcoming

    if (
        item.day !== today
    ) {

        return "upcoming";

    }


    const now =
        new Date();


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    const start =
        timeToMinutes(
            item.startTime
        );


    const end =
        timeToMinutes(
            item.endTime
        );


    if (
        currentMinutes >= end
    ) {

        return "completed";

    }


    if (
        currentMinutes >= start &&
        currentMinutes < end
    ) {

        return "ongoing";

    }


    return "upcoming";

}


// ============================================================
// LOAD TEACHER TIMETABLE
// ============================================================

async function loadTimetable(user) {

    try {

        console.log(
            "===================================="
        );

        console.log(
            "ATTENDIX TIMETABLE"
        );

        console.log(
            "Logged-in email:",
            user.email
        );

        console.log(
            "Logged-in UID:",
            user.uid
        );


        // ====================================================
        // LOAD TEACHERS
        // ====================================================

        const teachersSnapshot =
            await getDocs(
                collection(
                    db,
                    "teachers"
                )
            );


        teachersData =
            teachersSnapshot.docs.map(
                teacherDoc => ({

                    id: teacherDoc.id,

                    ...teacherDoc.data()

                })
            );


        console.log(
            "Teachers collection:",
            teachersData
        );


        // ====================================================
        // FIND CURRENT TEACHER
        // ====================================================

        const teacher =
            teachersData.find(
                item => {

                    return (

                        item.uid ===
                        user.uid

                    ) || (

                        normalize(
                            item.email
                        ) ===
                        normalize(
                            user.email
                        )

                    );

                }
            );


        // ====================================================
        // TEACHER FOUND
        // ====================================================

        if (teacher) {

            currentTeacherIds = [

                teacher.id,

                user.uid

            ];


            console.log(
                "Teacher profile found:",
                teacher
            );


            updateTeacherHeader(
                teacher
            );

        }


        // ====================================================
        // FALLBACK
        // ====================================================

        else {

            console.warn(
                "Teacher profile not found."
            );


            console.warn(
                "Using Auth UID as fallback."
            );


            currentTeacherIds = [

                user.uid

            ];


            updateTeacherHeader({

                name:
                    user.displayName ||
                    "Teacher",

                email:
                    user.email,

                department:
                    "Teacher"

            });

        }


        // ====================================================
        // LOAD TIMETABLE
        // ====================================================

        const timetableSnapshot =
            await getDocs(
                collection(
                    db,
                    "timetable"
                )
            );


        const allTimetable =
            timetableSnapshot.docs.map(
                timetableDoc => ({

                    id: timetableDoc.id,

                    ...timetableDoc.data()

                })
            );


        console.log(
            "All timetable:",
            allTimetable
        );


        // ====================================================
        // FILTER TEACHER CLASSES
        // ====================================================

        timetableData =
            allTimetable.filter(
                item => {

                    return currentTeacherIds.includes(
                        item.teacherUid
                    );

                }
            );


        console.log(
            "Teacher timetable:",
            timetableData
        );


        // ====================================================
        // LOAD SUBJECTS
        // ====================================================

        const subjectsSnapshot =
            await getDocs(
                collection(
                    db,
                    "subjects"
                )
            );


        subjectsData =
            subjectsSnapshot.docs.map(
                subjectDoc => ({

                    id: subjectDoc.id,

                    ...subjectDoc.data()

                })
            );


        console.log(
            "Subjects:",
            subjectsData
        );


        // ====================================================
        // LOAD ATTENDANCE
        // ====================================================

        const attendanceSnapshot =
            await getDocs(
                collection(
                    db,
                    "attendance"
                )
            );


        attendanceData =
            attendanceSnapshot.docs.map(
                attendanceDoc => ({

                    id: attendanceDoc.id,

                    ...attendanceDoc.data()

                })
            );


        // ====================================================
        // UPDATE PAGE
        // ====================================================

        updateStats();

        renderTimetable();


        console.log(
            "Timetable loaded successfully."
        );

        console.log(
            "===================================="
        );


    } catch (error) {

        console.error(
            "ATTENDIX Timetable Error:",
            error
        );


        showError(
            "Unable to load timetable."
        );

    }

}


// ============================================================
// UPDATE TEACHER HEADER
// ============================================================

function updateTeacherHeader(
    teacher
) {

    const name =
        teacher.name ||
        "Teacher";


    const department =
        teacher.department ||
        "Teacher Panel";


    if (pageSubtitle) {

        pageSubtitle.textContent =
            `Weekly schedule – ${name}`;

    }


    if (scheduleSubtitle) {

        scheduleSubtitle.textContent =
            department;

    }


    const userName =
        document.getElementById(
            "userName"
        );


    const userRole =
        document.getElementById(
            "userRole"
        );


    const userAvatar =
        document.getElementById(
            "userAvatar"
        );


    if (userName) {

        userName.textContent =
            name;

    }


    if (userRole) {

        userRole.textContent =
            department;

    }


    if (userAvatar) {

        const words =
            name
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        let initials =
            "T";


        if (
            words.length >= 2
        ) {

            initials =
                (
                    words[0][0] +
                    words[1][0]
                ).toUpperCase();

        }

        else if (
            words.length === 1
        ) {

            initials =
                words[0]
                    .substring(
                        0,
                        2
                    )
                    .toUpperCase();

        }


        userAvatar.textContent =
            initials;

    }

}


// ============================================================
// UPDATE STATS
// ============================================================

function updateStats() {

    const today =
        getCurrentDay();


    // ========================================================
    // TODAY
    // ========================================================

    const todayClasses =
        timetableData.filter(
            item =>
                item.day === today
        );


    // ========================================================
    // COMPLETED
    // ========================================================

    const completed =
        todayClasses.filter(
            item =>
                getClassStatus(
                    item
                ) === "completed"
        );


    // ========================================================
    // UPCOMING
    // ========================================================

    const upcoming =
        todayClasses.filter(
            item => {

                const status =
                    getClassStatus(
                        item
                    );


                return (

                    status ===
                    "upcoming"

                ) || (

                    status ===
                    "ongoing"

                );

            }
        );


    // ========================================================
    // SUBJECTS
    // ========================================================

    const subjectIds =
        new Set();


    timetableData.forEach(
        item => {

            if (
                item.subjectID
            ) {

                subjectIds.add(
                    item.subjectID
                );

            }

        }
    );


    // ========================================================
    // DISPLAY
    // ========================================================

    if (todayClassesEl) {

        todayClassesEl.textContent =
            todayClasses.length;

    }


    if (completedClassesEl) {

        completedClassesEl.textContent =
            completed.length;

    }


    if (upcomingClassesEl) {

        upcomingClassesEl.textContent =
            upcoming.length;

    }


    if (totalSubjectsEl) {

        totalSubjectsEl.textContent =
            subjectIds.size;

    }

}


// ============================================================
// RENDER TIMETABLE
// ============================================================

function renderTimetable() {

    if (!timetableGrid) {

        return;

    }


    const days = [

        "Monday",

        "Tuesday",

        "Wednesday",

        "Thursday",

        "Friday"

    ];


    timetableGrid.innerHTML =
        days
            .map(
                day =>
                    createDayBlock(
                        day
                    )
            )
            .join("");

}


// ============================================================
// CREATE DAY BLOCK
// ============================================================

function createDayBlock(
    day
) {

    const classes =
        timetableData

            .filter(
                item =>
                    item.day ===
                    day
            )

            .sort(
                (a, b) => {

                    return (

                        timeToMinutes(
                            a.startTime
                        ) -

                        timeToMinutes(
                            b.startTime
                        )

                    );

                }
            );


    // ========================================================
    // NO CLASSES
    // ========================================================

    if (
        classes.length === 0
    ) {

        return `

            <div class="day-block">

                <div class="day-header">

                    <h3>
                        ${day}
                    </h3>

                    <span>
                        0 classes
                    </span>

                </div>


                <div
                    style="
                        padding:20px;
                        text-align:center;
                        color:#9ca3af;
                        font-size:13px;
                    "
                >

                    No classes

                </div>

            </div>

        `;

    }


    // ========================================================
    // CLASSES
    // ========================================================

    return `

        <div class="day-block">


            <div class="day-header">

                <h3>
                    ${day}
                </h3>


                <span>

                    ${classes.length}

                    ${
                        classes.length === 1
                            ? "class"
                            : "classes"
                    }

                </span>

            </div>


            ${
                classes
                    .map(
                        item =>
                            createClassRow(
                                item
                            )
                    )
                    .join("")
            }


        </div>

    `;

}


// ============================================================
// CREATE CLASS ROW
// ============================================================

function createClassRow(
    item
) {

    const subject =
        getSubject(
            item.subjectID
        );


    const subjectName =
        subject?.name ||
        "Unknown Subject";


    const subjectCode =
        subject?.code ||
        "";


    const type =
        item.type ||
        "Class";


    const room =
        item.room ||
        "—";


    const branch =
        item.branch ||
        "—";


    const status =
        getClassStatus(
            item
        );


    // ========================================================
    // STATUS
    // ========================================================

    let statusText =
        "Upcoming";


    let statusClass =
        "badge-upcoming";


    if (
        status ===
        "completed"
    ) {

        statusText =
            "Completed";


        statusClass =
            "badge-completed";

    }


    if (
        status ===
        "ongoing"
    ) {

        statusText =
            "Ongoing";


        statusClass =
            "badge-blue";

    }


    // ========================================================
    // RETURN HTML
    // ========================================================

    return `

        <div class="class-row">


            <!-- TIME -->

            <span class="class-time">

                ${formatTime(
                    item.startTime
                )}

                –

                ${formatTime(
                    item.endTime
                )}

            </span>


            <!-- CLASS INFORMATION -->

            <div class="class-info">

                <strong>

                    ${escapeHTML(
                        subjectName
                    )}

                </strong>


                <span>

                    ${escapeHTML(
                        branch
                    )}

                    ${
                        subjectCode
                            ? ` · ${escapeHTML(
                                subjectCode
                            )}`
                            : ""
                    }

                    · Room

                    ${escapeHTML(
                        room
                    )}

                </span>

            </div>


            <!-- CLASS META -->

            <div class="class-meta">


                <span class="class-room">

                    Room

                    ${escapeHTML(
                        room
                    )}

                </span>


                <span class="badge badge-blue">

                    ${escapeHTML(
                        type
                    )}

                </span>


                <span
                    class="badge ${statusClass}"
                >

                    ${statusText}

                </span>


                <!-- EDIT BUTTON -->

                <button
                    type="button"
                    class="timetable-edit-btn"
                    data-id="${escapeHTML(
                        item.id
                    )}"
                    title="Edit class"
                >

                    ✏️ Edit

                </button>


                <!-- DELETE BUTTON -->

                <button
                    type="button"
                    class="timetable-delete-btn"
                    data-id="${escapeHTML(
                        item.id
                    )}"
                    title="Delete class"
                >

                    🗑 Delete

                </button>


            </div>


        </div>

    `;

}


// ============================================================
// EDIT TIMETABLE CLASS
// ============================================================

async function editTimetableClass(
    id
) {

    const item =
        timetableData.find(
            timetable =>
                timetable.id === id
        );


    if (!item) {

        alert(
            "Class not found."
        );

        return;

    }


    // ========================================================
    // START TIME
    // ========================================================

    const newStartTime =
        prompt(
            "Enter start time (HH:MM):",
            item.startTime ||
            ""
        );


    if (
        newStartTime ===
        null
    ) {

        return;

    }


    // ========================================================
    // END TIME
    // ========================================================

    const newEndTime =
        prompt(
            "Enter end time (HH:MM):",
            item.endTime ||
            ""
        );


    if (
        newEndTime ===
        null
    ) {

        return;

    }


    // ========================================================
    // ROOM
    // ========================================================

    const newRoom =
        prompt(
            "Enter room:",
            item.room ||
            ""
        );


    if (
        newRoom ===
        null
    ) {

        return;

    }


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
        !newStartTime.trim() ||
        !newEndTime.trim() ||
        !newRoom.trim()
    ) {

        alert(
            "All fields are required."
        );

        return;

    }


    if (
        timeToMinutes(
            newEndTime
        ) <=
        timeToMinutes(
            newStartTime
        )
    ) {

        alert(
            "End time must be after start time."
        );

        return;

    }


    // ========================================================
    // UPDATE FIRESTORE
    // ========================================================

    try {

        await updateDoc(

            doc(
                db,
                "timetable",
                id
            ),

            {

                startTime:
                    newStartTime.trim(),

                endTime:
                    newEndTime.trim(),

                room:
                    newRoom.trim(),

                updatedAt:
                    new Date()

            }

        );


        alert(
            "Class updated successfully!"
        );


        await reloadTimetable();


    } catch (error) {

        console.error(
            "Edit timetable error:",
            error
        );


        alert(
            "Unable to update class."
        );

    }

}


// ============================================================
// DELETE TIMETABLE CLASS
// ============================================================

async function deleteTimetableClass(
    id
) {

    const item =
        timetableData.find(
            timetable =>
                timetable.id === id
        );


    if (!item) {

        alert(
            "Class not found."
        );

        return;

    }


    const subject =
        getSubject(
            item.subjectID
        );


    const subjectName =
        subject?.name ||
        "this class";


    // ========================================================
    // CONFIRM
    // ========================================================

    const confirmed =
        confirm(

            `Are you sure you want to delete "${subjectName}" from ${item.day}?`

        );


    if (!confirmed) {

        return;

    }


    // ========================================================
    // DELETE FIRESTORE
    // ========================================================

    try {

        await deleteDoc(

            doc(
                db,
                "timetable",
                id
            )

        );


        alert(
            "Class deleted successfully!"
        );


        await reloadTimetable();


    } catch (error) {

        console.error(
            "Delete timetable error:",
            error
        );


        alert(
            "Unable to delete class."
        );

    }

}


// ============================================================
// RELOAD TIMETABLE
// ============================================================

async function reloadTimetable() {

    try {

        console.log(
            "Reloading timetable..."
        );


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "timetable"
                )
            );


        const allTimetable =
            snapshot.docs.map(
                timetableDoc => ({

                    id:
                        timetableDoc.id,

                    ...timetableDoc.data()

                })
            );


        timetableData =
            allTimetable.filter(
                item =>
                    currentTeacherIds.includes(
                        item.teacherUid
                    )
            );


        console.log(
            "Updated teacher timetable:",
            timetableData
        );


        updateStats();

        renderTimetable();


    } catch (error) {

        console.error(
            "Reload timetable error:",
            error
        );


        alert(
            "Unable to refresh timetable."
        );

    }

}


// ============================================================
// EDIT / DELETE BUTTON EVENTS
// ============================================================

document.addEventListener(
    "click",
    async event => {


        // ====================================================
        // EDIT
        // ====================================================

        const editButton =
            event.target.closest(
                ".timetable-edit-btn"
            );


        if (editButton) {

            const id =
                editButton.dataset.id;


            await editTimetableClass(
                id
            );


            return;

        }


        // ====================================================
        // DELETE
        // ====================================================

        const deleteButton =
            event.target.closest(
                ".timetable-delete-btn"
            );


        if (deleteButton) {

            const id =
                deleteButton.dataset.id;


            await deleteTimetableClass(
                id
            );

        }

    }
);


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    if (!timetableGrid) {

        return;

    }


    timetableGrid.innerHTML = `

        <div
            style="
                grid-column:1/-1;
                text-align:center;
                padding:40px;
                color:#dc2626;
            "
        >

            ${escapeHTML(
                message
            )}

        </div>

    `;

}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "../index.html";

            return;

        }


        await loadTimetable(
            user
        );

    }
);