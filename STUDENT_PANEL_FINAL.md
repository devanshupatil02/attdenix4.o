# ATTENDIX Student Panel

Student accounts use Firebase Authentication plus a Firestore `users/{authUid}` document.

Required Firestore user document:

- `role`: `student`
- `active`: `true`
- `name`: student's name
- `email`: student's login email
- `studentId`: exact ID matching `students/{studentId}`

Example:

```text
users/{STUDENT_AUTH_UID}
role: "student"
active: true
name: "Rahul Patil"
email: "student@example.com"
studentId: "STU002"
```

The student dashboard provides:

- My Attendance: overall/monthly attendance, subject-wise attendance and history.
- My Timetable: weekly timetable filtered to the student's branch/class.
- My Profile: name, student ID, roll number, branch, class, batch, email and RFID UID.

Student records are read using the student's own `studentId`, and the student panel does not expose Admin controls.
