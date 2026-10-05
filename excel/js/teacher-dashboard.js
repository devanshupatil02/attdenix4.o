import { guard, logout } from './teacher-core.js';
import {
  norm,
  esc,
  clean,
  studentIdOf,
  rollNoOf,
  branchOf,
  classOf,
  subjectIdOf,
  attendanceDate,
  attendanceStudentId,
  attendanceStatus,
  attendanceTime,
  indiaDate,
  indiaDay,
  dayNameForDate,
  timeMin,
  formatTime,
  computeStudentAttendance
} from './attendix-utils.js';

logout();

guard(async (c) => {
  const $ = (id) => document.getElementById(id);

  const students = Array.isArray(c?.students) ? c.students : [];
  const timetable = Array.isArray(c?.timetable) ? c.timetable : [];
  const attendance = Array.isArray(c?.attendance) ? c.attendance : [];
  const subjects = Array.isArray(c?.subjects) ? c.subjects : [];
  const teacher = c?.teacher || {};
  const teacherUid = clean(teacher.id || teacher.uid || '');
  const subjectMap = new Map(subjects.map((s) => [String(s.id), s]));
  const studentMap = new Map(students.map((s) => [studentIdOf(s), s]));

  const today = indiaDate();
  const todayName = indiaDay();
  const monthStart = `${today.slice(0, 7)}-01`;

  // -----------------------------
  // TODAY'S CLASSES
  // -----------------------------
  const todayClasses = timetable
    .filter((t) => t && t.active !== false && norm(t.day) === norm(todayName))
    .sort((a, b) => (timeMin(a.startTime) ?? 9999) - (timeMin(b.startTime) ?? 9999));

  if ($('todayClassesCount')) $('todayClassesCount').textContent = String(todayClasses.length);
  if ($('myStudentsCount')) $('myStudentsCount').textContent = String(students.length);
  if ($('studentGroup')) $('studentGroup').textContent = teacher.branch || 'Assigned students';

  // -----------------------------
  // PRESENT TODAY
  // -----------------------------
  const presentStudents = new Set();
  for (const record of attendance) {
    if (attendanceDate(record) !== today) continue;
    if (teacherUid && clean(record.teacherUid || record.teacher_uid) !== teacherUid) continue;
    if (norm(attendanceStatus(record)) !== 'present') continue;

    const sid = attendanceStudentId(record);
    if (sid && studentMap.has(sid)) presentStudents.add(sid);
  }

  if ($('presentToday')) $('presentToday').textContent = String(presentStudents.size);
  if ($('presentSubtext')) $('presentSubtext').textContent = `${presentStudents.size} present today`;

  // -----------------------------
  // CURRENT-PERIOD ATTENDANCE RATE
  // -----------------------------
  let totalClasses = 0;
  let totalPresent = 0;

  for (const student of students) {
    try {
      const result = computeStudentAttendance(
        student,
        timetable,
        attendance,
        monthStart,
        today,
        ''
      );
      totalClasses += Number(result?.total || 0);
      totalPresent += Number(result?.present || 0);
    } catch (error) {
      console.warn('Attendance calculation skipped for student:', studentIdOf(student), error);
    }
  }

  const attendanceRate = totalClasses > 0
    ? (totalPresent * 100 / totalClasses)
    : 0;

  if ($('attendanceRate')) $('attendanceRate').textContent = `${attendanceRate.toFixed(1)}%`;

  // -----------------------------
  // TODAY'S CLASSES TABLE
  // -----------------------------
  const classBody = $('todayClassesTable');
  if (classBody) {
    classBody.innerHTML = todayClasses.length
      ? todayClasses.map((t) => {
          const subjectId = subjectIdOf(t);
          const subjectName = subjectMap.get(String(subjectId))?.name || subjectId || 'Unknown Subject';
          return `
            <tr>
              <td>${esc(formatTime(t.startTime))} – ${esc(formatTime(t.endTime))}</td>
              <td><strong>${esc(subjectName)}</strong></td>
              <td>${esc(teacher.name || '')}</td>
              <td>${esc(branchOf(t) || t.branch || '')}</td>
              <td>${esc(t.room || '—')}</td>
              <td>${esc(t.type || 'Lecture')}</td>
              <td>Scheduled</td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;">No classes scheduled today.</td></tr>';
  }

  // -----------------------------
  // ATTENDANCE OVERVIEW
  // Show all teacher students, not only scanned students.
  // -----------------------------
  const overviewBody = $('attendanceOverviewTable');
  if (overviewBody) {
    const rows = students.map((student) => {
      let result = { total: 0, present: 0, pct: 0 };
      try {
        result = computeStudentAttendance(
          student,
          timetable,
          attendance,
          monthStart,
          today,
          ''
        );
      } catch (error) {
        console.warn('Overview calculation skipped:', studentIdOf(student), error);
      }

      const last = attendance
        .filter((a) => attendanceStudentId(a) === studentIdOf(student))
        .sort((a, b) => `${attendanceDate(b)} ${attendanceTime(b)}`.localeCompare(`${attendanceDate(a)} ${attendanceTime(a)}`))[0];

      const subjectNames = [...new Set(
        timetable
          .filter((t) =>
            t.active !== false &&
            norm(t.branch) === norm(branchOf(student)) &&
            norm(t.class) === norm(classOf(student))
          )
          .map(subjectIdOf)
          .filter(Boolean)
          .map((id) => subjectMap.get(String(id))?.name || id)
      )];

      const pct = Number(result?.pct || 0);
      const status = result?.total
        ? (pct >= 75 ? 'Good' : 'Low')
        : 'No Classes';

      return { student, result, last, subjectNames, pct, status };
    }).sort((a, b) =>
      String(rollNoOf(a.student)).localeCompare(String(rollNoOf(b.student)), undefined, { numeric: true })
    );

    overviewBody.innerHTML = rows.length
      ? rows.map(({ student, last, subjectNames, pct, status }) => `
          <tr>
            <td>${esc(rollNoOf(student) || '—')}</td>
            <td><strong>${esc(student.name || 'Unknown')}</strong></td>
            <td>${esc(subjectNames.join(', ') || '—')}</td>
            <td>${pct.toFixed(1)}%</td>
            <td>${last ? esc(`${attendanceDate(last)} ${formatTime(attendanceTime(last))}`) : 'Never'}</td>
            <td>
              <span class="badge ${status === 'Good' ? 'badge-good' : status === 'Low' ? 'badge-low' : ''}">
                ${esc(status)}
              </span>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;">No students assigned to this teacher.</td></tr>';
  }
});
