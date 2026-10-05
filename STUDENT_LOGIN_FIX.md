# ATTENDIX Student Login Fix

Fix only for the Student Panel: student-core now first reads `students/{studentId}` and, if that document is missing, falls back to locating the student by the `studentId` (or legacy `student_id`) field. This prevents a mismatch between the student's Auth profile and the Firestore student document ID from blocking the Student Panel.

No Firestore data is modified by this package.
