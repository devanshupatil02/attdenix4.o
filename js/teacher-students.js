import { guard, logout } from './teacher-core.js';
import { esc, norm, studentIdOf, rollNoOf, branchOf, classOf, attendanceStudentId, attendanceDate, attendanceStatus, attendanceTime, indiaDate, dayNameForDate, computeStudentAttendance, subjectIdOf, timeMin, formatTime } from './attendix-utils.js';

logout();
guard(async c => {
  const $ = id => document.getElementById(id);
  const today = indiaDate();
  const monthStart = `${today.slice(0, 7)}-01`;
  const subjectMap = new Map(c.subjects.map(s => [s.id, s]));

  const todayClasses = c.timetable
    .filter(t => norm(t.day) === norm(dayNameForDate(today)))
    .sort((a, b) => (timeMin(a.startTime) ?? 9999) - (timeMin(b.startTime) ?? 9999));

  $('myStudentsCount') && ($('myStudentsCount').textContent = c.students.length);
  $('studentGroup') && ($('studentGroup').textContent = c.teacher.branch || 'Assigned students');
  $('todayClassesCount') && ($('todayClassesCount').textContent = todayClasses.length);

  // Teacher summary cards: show real values instead of placeholders.
  const todayAttendance = c.attendance.filter(a =>
    attendanceDate(a) === today &&
    attendanceStudentId(a) &&
    c.students.some(s => studentIdOf(s) === attendanceStudentId(a)) &&
    norm(a.teacherUid || a.teacher_uid) === norm(c.teacher.id) &&
    norm(attendanceStatus(a)) === 'present'
  );
  const presentTodaySet = new Set(todayAttendance.map(attendanceStudentId));
  const monthTotals = c.students.reduce((acc, student) => {
    const r = computeStudentAttendance(student, c.timetable, c.attendance, monthStart, today, '');
    acc.total += r.total;
    acc.present += r.present;
    return acc;
  }, { total: 0, present: 0 });
  const periodRate = monthTotals.total ? (monthTotals.present * 100 / monthTotals.total) : 0;

  $('presentToday') && ($('presentToday').textContent = presentTodaySet.size);
  $('presentSubtext') && ($('presentSubtext').textContent = `${presentTodaySet.size} present today`);
  $('attendanceRate') && ($('attendanceRate').textContent = periodRate.toFixed(1) + '%');

  const classBody = $('todayClassesTable');
  if (classBody) {
    classBody.innerHTML = todayClasses.length
      ? todayClasses.map(t => `
        <tr>
          <td>${esc(formatTime(t.startTime))} – ${esc(formatTime(t.endTime))}</td>
          <td><strong>${esc(subjectMap.get(subjectIdOf(t))?.name || subjectIdOf(t) || 'Unknown Subject')}</strong></td>
          <td>${esc(t.branch || '')}</td>
          <td>${esc(t.room || '—')}</td>
          <td>${esc(t.type || 'Lecture')}</td>
          <td>Scheduled</td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;">No classes scheduled today.</td></tr>';
  }

  const body = $('attendanceOverviewTable');
  if (!body) return;

  const rows = c.students.map(s => {
    const r = computeStudentAttendance(s, c.timetable, c.attendance, monthStart, today, '');
    const last = c.attendance
      .filter(a => attendanceStudentId(a) === studentIdOf(s))
      .sort((a, b) => `${attendanceDate(b)} ${attendanceTime(b)}`.localeCompare(`${attendanceDate(a)} ${attendanceTime(a)}`))[0];

    const subjects = [...new Set(c.timetable
      .filter(t => norm(t.branch) === norm(branchOf(s)) && norm(t.class) === norm(classOf(s)))
      .map(subjectIdOf)
      .filter(id => c.subjectIds.has(id))
      .map(id => subjectMap.get(id)?.name || id))];

    return { s, r, last, subjects };
  }).sort((a, b) => String(rollNoOf(a.s)).localeCompare(String(rollNoOf(b.s)), undefined, { numeric: true }));

  body.innerHTML = rows.length
    ? rows.map(({ s, r, last, subjects }) => `
      <tr>
        <td>${esc(rollNoOf(s) || '—')}</td>
        <td><strong>${esc(s.name || 'Unknown')}</strong><div style="font-size:11px;color:#6b7280;">${esc(studentIdOf(s))}</div></td>
        <td>${esc(subjects.join(', ') || '—')}</td>
        <td>${r.total ? r.pct.toFixed(1) + '%' : '0.0%'}</td>
        <td>${last ? esc(`${attendanceDate(last)} ${formatTime(attendanceTime(last))}`) : 'Never'}</td>
        <td><span class="badge ${r.total && r.pct >= 75 ? 'badge-good' : 'badge-low'}">${r.total && r.pct >= 75 ? 'Good' : 'Low'}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;">No students assigned to this teacher.</td></tr>';
});
