// ============================================
// ATTENDIX - STUDENT TIMETABLE
// ============================================


// ============================================
// FIREBASE CORE
// ============================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";


// ============================================
// FIREBASE AUTH
// ============================================

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ============================================
// FIREBASE FIRESTORE
// ============================================

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {

    apiKey:
        "AIzaSyAxVUvIhjrBhmR_0uyXJyQmD00eQ9mgq9M",

    authDomain:
        "attendix-rfid-attendance.firebaseapp.com",

    projectId:
        "attendix-rfid-attendance",

    storageBucket:
        "attendix-rfid-attendance.firebasestorage.app",

    messagingSenderId:
        "1038365817716",

    appId:
        "1:1038365817716:web:a1160a5265dfb417da8a21",

    measurementId:
        "G-ZYCH6VZHD0"
};


// ============================================
// INITIALIZE FIREBASE
// ============================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


// ============================================
// GLOBAL DATA
// ============================================

let currentUser = null;

let currentUserData = null;

let studentData = null;

let subjectsData = [];

let timetableData = [];


// ============================================
// CURRENT WEEK
// ============================================

let currentWeekDate = new Date();


// ============================================
// DOM ELEMENTS
// ============================================

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const welcomeName =
    document.getElementById("welcomeName");

const studentClassInfo =
    document.getElementById("studentClassInfo");

const currentDate =
    document.getElementById("currentDate");

const totalClasses =
    document.getElementById("totalClasses");

const todayClasses =
    document.getElementById("todayClasses");

const totalSubjects =
    document.getElementById("totalSubjects");

const todayRoom =
    document.getElementById("todayRoom");

const timetableGrid =
    document.getElementById("timetableGrid");

const weekTitle =
    document.getElementById("weekTitle");

const previousWeekBtn =
    document.getElementById("previousWeekBtn");

const nextWeekBtn =
    document.getElementById("nextWeekBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// ============================================
// DAYS
// ============================================

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];


// ============================================
// HTML ESCAPE
// ============================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================
// START PAGE
// ============================================

async function startPage() {

    try {

        await setPersistence(
            auth,
            browserLocalPersistence
        );

    } catch (error) {

        console.error(
            "Auth persistence error:",
            error
        );
    }


    onAuthStateChanged(
        auth,
        async (user) => {

            console.log(
                "Student Timetable Auth:",
                user
                    ? user.email
                    : "No user"
            );


            if (!user) {

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            currentUser = user;


            try {

                await loadStudentTimetable();

            } catch (error) {

                console.error(
                    "Student Timetable Error:",
                    error
                );

                showPageError(
                    "Unable to load timetable."
                );
            }

        }
    );
}


startPage();


// ============================================
// LOAD STUDENT TIMETABLE
// ============================================

async function loadStudentTimetable() {

    // ========================================
    // GET USER DOCUMENT
    // ========================================

    const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const userSnapshot =
        await getDoc(userRef);


    if (!userSnapshot.exists()) {

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    currentUserData =
        userSnapshot.data();


    // ========================================
    // CHECK ROLE
    // ========================================

    const role =
        String(
            currentUserData.role || ""
        )
            .trim()
            .toLowerCase();


    if (role !== "student") {

        await signOut(auth);

        window.location.replace(
            "../index.html"
        );

        return;
    }


    // ========================================
    // GET STUDENT ID
    // ========================================

    const studentId =
        currentUserData.student_id;


    if (!studentId) {

        showPageError(
            "Student profile is not linked. Please contact the administrator."
        );

        return;
    }


    console.log(
        "Student ID:",
        studentId
    );


    // ========================================
    // GET STUDENT PROFILE
    // ========================================

    const studentRef =
        doc(
            db,
            "students",
            studentId
        );


    const studentSnapshot =
        await getDoc(studentRef);


    if (!studentSnapshot.exists()) {

        showPageError(
            "Student profile not found."
        );

        return;
    }


    studentData = {

        id:
            studentSnapshot.id,

        ...studentSnapshot.data()

    };


    console.log(
        "Student Profile:",
        studentData
    );


    // ========================================
    // USER INFORMATION
    // ========================================

    setUserDetails();


    // ========================================
    // LOAD SUBJECTS
    // ========================================

    const subjectsSnapshot =
        await getDocs(
            collection(
                db,
                "subjects"
            )
        );


    subjectsData =
        subjectsSnapshot.docs.map(
            document => ({

                id:
                    document.id,

                ...document.data()

            })
        );


    // ========================================
    // LOAD TIMETABLE
    // ========================================

    const timetableSnapshot =
        await getDocs(
            collection(
                db,
                "timetable"
            )
        );


    timetableData =
        timetableSnapshot.docs.map(
            document => ({

                id:
                    document.id,

                ...document.data()

            })
        );


    console.log(
        "Total timetable records:",
        timetableData.length
    );


    // ========================================
    // FILTER STUDENT TIMETABLE
    // ========================================

    timetableData =
        filterStudentTimetable(
            timetableData
        );


    console.log(
        "Student timetable records:",
        timetableData.length
    );


    // ========================================
    // RENDER
    // ========================================

    updateSummary();

    renderWeek();

    updateCurrentDate();
}


// ============================================
// FILTER TIMETABLE
// ============================================

function filterStudentTimetable(classes) {

    if (!studentData) {

        return [];
    }


    const studentDepartment =
        String(
            studentData.department || ""
        )
            .trim()
            .toLowerCase();


    const studentBranch =
        String(
            studentData.branch || ""
        )
            .trim()
            .toLowerCase();


    // ----------------------------------------
    // Current schema uses "branch"
    // ----------------------------------------

    const filtered =
        classes.filter(
            classItem => {

                // Inactive class
                if (
                    classItem.active === false
                ) {

                    return false;
                }


                const classBranch =
                    String(
                        classItem.branch || ""
                    )
                        .trim()
                        .toLowerCase();


                // If timetable has no branch,
                // don't show it to student.
                if (!classBranch) {

                    return false;
                }


                // Match department OR branch
                return (
                    (
                        studentDepartment &&
                        classBranch ===
                        studentDepartment
                    )
                    ||
                    (
                        studentBranch &&
                        classBranch ===
                        studentBranch
                    )
                );
            }
        );


    return filtered;
}


// ============================================
// USER DETAILS
// ============================================

function setUserDetails() {

    const name =
        studentData.name ||
        currentUserData.name ||
        "Student";


    if (userName) {

        userName.textContent =
            name;
    }


    if (welcomeName) {

        welcomeName.textContent =
            name;
    }


    if (userRole) {

        userRole.textContent =
            "Student";
    }


    if (userAvatar) {

        userAvatar.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase();
    }


    if (studentClassInfo) {

        const department =
            studentData.department ||
            "Department not available";


        const studentClass =
            studentData.class ||
            "Class not available";


        studentClassInfo.textContent =
            `${department} • ${studentClass}`;
    }
}


// ============================================
// SUBJECT NAME
// ============================================

function getSubjectName(subjectId) {

    const subject =
        subjectsData.find(
            subject =>
                String(subject.id)
                ===
                String(subjectId)
        );


    if (!subject) {

        return (
            subjectId ||
            "Unknown Subject"
        );
    }


    return (
        subject.name ||
        subject.code ||
        subject.id
    );
}


// ============================================
// TEACHER NAME
// ============================================

function getTeacherName(teacherUid) {

    if (!teacherUid) {

        return "";
    }


    // Timetable only contains teacherUid.
    // Teacher names are not required for
    // timetable display if unavailable.

    return "";
}


// ============================================
// NORMALIZE DAY
// ============================================

function normalizeDay(day) {

    return String(day || "")
        .trim()
        .toLowerCase();
}


// ============================================
// GET CLASSES FOR DAY
// ============================================

function getClassesForDay(day) {

    return timetableData
        .filter(
            classItem =>
                normalizeDay(
                    classItem.day
                )
                ===
                normalizeDay(day)
        )
        .sort(
            (a, b) => {

                const timeA =
                    String(
                        a.startTime || ""
                    );

                const timeB =
                    String(
                        b.startTime || ""
                    );

                return timeA.localeCompare(
                    timeB
                );
            }
        );
}


// ============================================
// FORMAT TIME
// ============================================

function formatTime(time) {

    if (!time) {

        return "-";
    }


    const parts =
        String(time).split(":");


    if (parts.length < 2) {

        return time;
    }


    const hour =
        Number(parts[0]);


    const minute =
        Number(parts[1]);


    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {

        return time;
    }


    const date =
        new Date();


    date.setHours(
        hour,
        minute,
        0,
        0
    );


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ============================================
// GET DAY DATE
// ============================================

function getMonday(date) {

    const result =
        new Date(date);


    result.setHours(
        0,
        0,
        0,
        0
    );


    const day =
        result.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    result.setDate(
        result.getDate() + difference
    );


    return result;
}


function getDateForDay(
    monday,
    dayIndex
) {

    const date =
        new Date(monday);


    date.setDate(
        monday.getDate() + dayIndex
    );


    return date;
}


// ============================================
// DATE KEY
// ============================================

function getDateKey(date) {

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            date.getDate()
        ).padStart(2, "0")
    );
}


// ============================================
// TODAY DAY
// ============================================

function getTodayDayName() {

    const day =
        new Date().getDay();


    const names = [

        "Sunday",

        "Monday",

        "Tuesday",

        "Wednesday",

        "Thursday",

        "Friday",

        "Saturday"

    ];


    return names[day];
}


// ============================================
// UPDATE SUMMARY
// ============================================

function updateSummary() {

    // ----------------------------------------
    // Weekly classes
    // ----------------------------------------

    const classCount =
        timetableData.length;


    if (totalClasses) {

        totalClasses.textContent =
            classCount;
    }


    // ----------------------------------------
    // Subjects
    // ----------------------------------------

    const uniqueSubjects =
        new Set();


    timetableData.forEach(
        classItem => {

            if (
                classItem.subjectID
            ) {

                uniqueSubjects.add(
                    classItem.subjectID
                );
            }
        }
    );


    if (totalSubjects) {

        totalSubjects.textContent =
            uniqueSubjects.size;
    }


    // ----------------------------------------
    // Today's classes
    // ----------------------------------------

    const today =
        getTodayDayName();


    const todayClassList =
        getClassesForDay(
            today
        );


    if (todayClasses) {

        todayClasses.textContent =
            todayClassList.length;
    }


    // ----------------------------------------
    // Today's rooms
    // ----------------------------------------

    const rooms =
        todayClassList
            .map(
                item =>
                    item.room
            )
            .filter(Boolean);


    const uniqueRooms =
        [...new Set(rooms)];


    if (todayRoom) {

        todayRoom.textContent =
            uniqueRooms.length > 0
                ? uniqueRooms.join(", ")
                : "-";
    }
}


// ============================================
// UPDATE CURRENT DATE
// ============================================

function updateCurrentDate() {

    if (!currentDate) {

        return;
    }


    const today =
        new Date();


    currentDate.textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
}


// ============================================
// RENDER WEEK
// ============================================

function renderWeek() {

    if (!timetableGrid) {

        return;
    }


    const monday =
        getMonday(
            currentWeekDate
        );


    const sunday =
        getDateForDay(
            monday,
            6
        );


    updateWeekTitle(
        monday,
        sunday
    );


    timetableGrid.innerHTML = "";


    DAYS.forEach(
        (day, index) => {

            const date =
                getDateForDay(
                    monday,
                    index
                );


            const dateKey =
                getDateKey(
                    date
                );


            const todayKey =
                getDateKey(
                    new Date()
                );


            const isToday =
                dateKey === todayKey;


            const classes =
                getClassesForDay(
                    day
                );


            const dayColumn =
                document.createElement(
                    "div"
                );


            dayColumn.className =
                "day-column";


            if (isToday) {

                dayColumn.classList.add(
                    "today"
                );
            }


            // --------------------------------
            // DAY HEADER
            // --------------------------------

            const dayHeader =
                document.createElement(
                    "div"
                );


            dayHeader.className =
                "day-header";


            const dayName =
                document.createElement(
                    "strong"
                );


            dayName.textContent =
                day;


            const dateText =
                document.createElement(
                    "span"
                );


            dateText.textContent =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short"
                    }
                );


            dayHeader.appendChild(
                dayName
            );


            dayHeader.appendChild(
                dateText
            );


            if (isToday) {

                const todayLabel =
                    document.createElement(
                        "span"
                    );


                todayLabel.className =
                    "today-label";


                todayLabel.textContent =
                    "TODAY";


                dayHeader.appendChild(
                    todayLabel
                );
            }


            // --------------------------------
            // DAY CLASSES
            // --------------------------------

            const classesContainer =
                document.createElement(
                    "div"
                );


            classesContainer.className =
                "day-classes";


            if (classes.length === 0) {

                const empty =
                    document.createElement(
                        "div"
                    );


                empty.className =
                    "empty-day";


                empty.textContent =
                    "No classes";


                classesContainer.appendChild(
                    empty
                );

            } else {

                classes.forEach(
                    classItem => {

                        const classCard =
                            createClassCard(
                                classItem
                            );


                        classesContainer.appendChild(
                            classCard
                        );
                    }
                );
            }


            dayColumn.appendChild(
                dayHeader
            );


            dayColumn.appendChild(
                classesContainer
            );


            timetableGrid.appendChild(
                dayColumn
            );
        }
    );
}


// ============================================
// CREATE CLASS CARD
// ============================================

function createClassCard(classItem) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "class-item";


    // ----------------------------------------
    // TIME
    // ----------------------------------------

    const time =
        document.createElement(
            "div"
        );


    time.className =
        "class-time";


    time.textContent =
        `${formatTime(
            classItem.startTime
        )} - ${formatTime(
            classItem.endTime
        )}`;


    // ----------------------------------------
    // SUBJECT
    // ----------------------------------------

    const subject =
        document.createElement(
            "div"
        );


    subject.className =
        "class-subject";


    subject.textContent =
        getSubjectName(
            classItem.subjectID
        );


    // ----------------------------------------
    // DETAILS
    // ----------------------------------------

    const details =
        document.createElement(
            "div"
        );


    details.className =
        "class-details";


    // Room

    if (classItem.room) {

        const room =
            document.createElement(
                "div"
            );


        room.className =
            "class-detail";


        room.textContent =
            `Room ${classItem.room}`;


        details.appendChild(
            room
        );
    }


    // Branch

    if (classItem.branch) {

        const branch =
            document.createElement(
                "div"
            );


        branch.className =
            "class-detail";


        branch.textContent =
            classItem.branch;


        details.appendChild(
            branch
        );
    }


    // ----------------------------------------
    // TYPE
    // ----------------------------------------

    const type =
        document.createElement(
            "span"
        );


    type.className =
        "class-type";


    type.textContent =
        classItem.type ||
        "Class";


    // ----------------------------------------
    // APPEND
    // ----------------------------------------

    card.appendChild(
        time
    );


    card.appendChild(
        subject
    );


    card.appendChild(
        details
    );


    card.appendChild(
        type
    );


    return card;
}


// ============================================
// WEEK TITLE
// ============================================

function updateWeekTitle(
    monday,
    sunday
) {

    if (!weekTitle) {

        return;
    }


    const startText =
        monday.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short"
            }
        );


    const endText =
        sunday.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    weekTitle.textContent =
        `${startText} - ${endText}`;
}


// ============================================
// PREVIOUS WEEK
// ============================================

if (previousWeekBtn) {

    previousWeekBtn.addEventListener(
        "click",
        () => {

            currentWeekDate.setDate(
                currentWeekDate.getDate() - 7
            );


            renderWeek();

        }
    );
}


// ============================================
// NEXT WEEK
// ============================================

if (nextWeekBtn) {

    nextWeekBtn.addEventListener(
        "click",
        () => {

            currentWeekDate.setDate(
                currentWeekDate.getDate() + 7
            );


            renderWeek();

        }
    );
}


// ============================================
// LOGOUT
// ============================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );


                window.location.replace(
                    "../index.html"
                );

            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );
            }
        }
    );
}


// ============================================
// PAGE ERROR
// ============================================

function showPageError(message) {

    if (timetableGrid) {

        timetableGrid.innerHTML = `

            <div class="loading-state">

                ${escapeHTML(message)}

            </div>

        `;
    }


    if (studentClassInfo) {

        studentClassInfo.textContent =
            "Unable to load timetable";
    }


    if (totalClasses) {

        totalClasses.textContent =
            "0";
    }


    if (todayClasses) {

        todayClasses.textContent =
            "0";
    }


    if (totalSubjects) {

        totalSubjects.textContent =
            "0";
    }


    if (todayRoom) {

        todayRoom.textContent =
            "-";
    }
}