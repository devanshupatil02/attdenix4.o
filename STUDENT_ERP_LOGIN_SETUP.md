# ATTENDIX Student ERP Login

Student login uses the student's existing database email as the Firebase Authentication email. The student's ERP number is used as the initial Firebase Authentication password.

## Firestore student record
Each student should have:
- `studentId`
- `email` (actual student email)
- `erpNo` (ERP number from ID card)
- existing attendance/academic fields

## Firestore users record
After creating the student's Firebase Authentication account, create `users/{AUTH_UID}` with:
- `role`: `student`
- `active`: `true`
- `name`: student's name
- `email`: same student email
- `studentId`: exact student ID, e.g. `STU002`

## Login
Student selects Student, enters their database email, and enters their ERP number in the password field. Firebase Authentication validates the email/password. The Student Panel then uses `users/{uid}.studentId` to load only that student's record and attendance.

## Important
The Firestore email/ERP fields do not automatically create Firebase Authentication accounts. Each student's Auth account must be created in Firebase Authentication (or through a secure Admin SDK/backend provisioning process), with the ERP number as the initial password. Do not store the ERP number as a Firestore password.
