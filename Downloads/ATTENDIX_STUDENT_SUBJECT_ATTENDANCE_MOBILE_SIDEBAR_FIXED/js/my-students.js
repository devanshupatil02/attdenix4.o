// Legacy route kept for compatibility with old bookmarks.
// The active Teacher Panel uses teacher-students.html and teacher-students.js.
if (document.body?.dataset?.role === 'teacher') {
  location.replace('teacher-students.html');
}
