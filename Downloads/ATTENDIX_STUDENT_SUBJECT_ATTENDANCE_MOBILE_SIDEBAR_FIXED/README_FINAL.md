ATTENDIX final requirements build

This package uses the existing frontend and hardware files as the base and keeps Firestore values unchanged.

Implemented frontend requirements:
- Admin dashboard: today's classes resolve subject names from subjectId; branch attendance summary.
- Admin students: all active students display; month-to-date Good/Low/Average attendance; batch/branch/year filters; last scan.
- Admin attendance: all students in the selected class/day are shown and marked Present/Absent/No Class; subject names resolve from subjectId.
- Admin reports: correct roll numbers and scheduled-class based attendance totals.
- Admin teachers: subjects, student counts, classes/week derived from teacher_assignments/timetable.
- Teacher dashboard/students/attendance/reports/timetable panels use teacher-specific workflows.
- Student dashboard/attendance/profile/timetable use users/{uid}.studentId -> students/{studentId} and show only that student's context in the UI.
- Login accepts users.studentId for student accounts.
- RFID registration writes registration_requests/active and waits for hardware completion.
- Existing hardware .ino is preserved unchanged in this frontend-focused merge.

Before production use, publish the included firestore.rules only after verifying the query patterns with your Firebase rules simulator; the UI uses the existing Firestore collections and field names described in the project.


Live refresh: Teacher and Student pages re-read Firebase data every 30 seconds while open.
