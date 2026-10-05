import {guard,logout} from './student-core.js';
import {norm,esc,subjectIdOf,attendanceStatus,indiaDate,indiaDay,scheduledForStudent,computeStudentAttendance,attendanceDate,attendanceTime} from './attendix-utils.js';

logout();

guard(async c => {
  const s = c.student || {};
  const today = indiaDate();
  const monthStart = `${today.slice(0,7)}-01`;
  const subjects = c.subjects || [];
  const timetable = c.timetable || [];
  const attendance = c.attendance || [];
  const sub = new Map(subjects.map(x => [String(x.id), x]));

  // Summary cards
  const rep = computeStudentAttendance(s, timetable, attendance, monthStart, today, '');
  document.getElementById('overallAttendance')?.replaceChildren(document.createTextNode(rep.pct.toFixed(1) + '%'));
  document.getElementById('presentCount')?.replaceChildren(document.createTextNode(String(rep.present)));
  document.getElementById('absentCount')?.replaceChildren(document.createTextNode(String(rep.absent)));
  document.getElementById('totalClasses')?.replaceChildren(document.createTextNode(String(rep.total)));
  document.getElementById('attendanceSubtext')?.replaceChildren(document.createTextNode('Current month'));

  // Today's classes
  const todayClasses = timetable
    .filter(x => x.active !== false && norm(x.day) === norm(indiaDay()) && scheduledForStudent(x, s))
    .sort((a,b) => String(a.startTime).localeCompare(String(b.startTime)));
  const classesBody = document.getElementById('todayClassesBody');
  if (classesBody) {
    classesBody.innerHTML = todayClasses.length
      ? todayClasses.map(x => `<tr><td>${esc(x.startTime || '—')} – ${esc(x.endTime || '—')}</td><td>${esc(sub.get(String(subjectIdOf(x)))?.name || subjectIdOf(x) || '—')}</td><td>${esc(x.room || '—')}</td><td>${esc(x.type || 'Lecture')}</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty-state">No classes today.</td></tr>';
  }

  // Subject-wise attendance: build from BOTH timetable subjects and actual attendance records.
  // This prevents a permanent loading state when a subject has attendance but no matching
  // timetable session in the selected period.
  const ids = new Set();
  for (const x of subjects) ids.add(String(x.id));
  for (const a of attendance) {
    const d = attendanceDate(a);
    if (d >= monthStart && d <= today) {
      const id = subjectIdOf(a);
      if (id) ids.add(String(id));
    }
  }

  const rows = [];
  for (const sid of ids) {
    const r = computeStudentAttendance(s, timetable, attendance, monthStart, today, sid);
    if (r.total > 0) {
      rows.push({sid, name: sub.get(sid)?.name || sub.get(sid)?.code || sid, ...r});
      continue;
    }

    // Fallback for a subject with attendance records but no timetable sessions in the period.
    const presentRecords = attendance.filter(a => {
      const d = attendanceDate(a);
      return d >= monthStart && d <= today && String(subjectIdOf(a)) === sid && norm(attendanceStatus(a)) === 'present';
    });
    if (presentRecords.length) {
      rows.push({sid, name: sub.get(sid)?.name || sub.get(sid)?.code || sid, total: presentRecords.length, present: presentRecords.length, absent: 0, pct: 100});
    }
  }

  rows.sort((a,b) => a.name.localeCompare(b.name));
  const body = document.getElementById('subjectAttendanceBody');
  if (body) {
    body.innerHTML = rows.length
      ? rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.total}</td><td>${r.pct.toFixed(1)}%</td></tr>`).join('')
      : '<tr><td colspan="5" class="empty-state">No attendance data yet.</td></tr>';
  }

  document.getElementById('currentDate')?.replaceChildren(document.createTextNode(today));
});
