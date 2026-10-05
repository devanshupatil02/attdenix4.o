import {guard,logout} from './student-core.js';
import {esc,subjectIdOf,attendanceDate,attendanceStatus,attendanceTime,indiaDate,computeStudentAttendance} from './attendix-utils.js';

logout();

guard(async c=>{
  const s = c.student;
  const today = indiaDate();
  const start = `${today.slice(0,7)}-01`;
  const sub = new Map(c.subjects.map(x=>[x.id,x]));

  const rep = computeStudentAttendance(s,c.timetable,c.attendance,start,today,'');
  document.getElementById('overallAttendance')?.replaceChildren(document.createTextNode(rep.pct.toFixed(1)+'%'));
  document.getElementById('totalPresent')?.replaceChildren(document.createTextNode(String(rep.present)));
  document.getElementById('totalAbsent')?.replaceChildren(document.createTextNode(String(rep.absent)));
  document.getElementById('totalClasses')?.replaceChildren(document.createTextNode(String(rep.total)));

  const filter = document.getElementById('subjectFilter');
  if(filter && filter.dataset.ready !== '1'){
    const existing = new Set([...filter.options].map(o=>o.value));
    for(const x of c.subjects){
      if(existing.has(String(x.id))) continue;
      const option = document.createElement('option');
      option.value = x.id;
      option.textContent = x.name || x.id;
      filter.appendChild(option);
    }
    filter.dataset.ready = '1';
    filter.addEventListener('change', render);
  }

  function render(){
    const sid = filter?.value || '';
    const studentKey = String(s.studentId || s.id);
    const rows = c.attendance
      .filter(a => String(a.studentId || a.student_id || '') === studentKey)
      .filter(a => !sid || String(a.subjectId || a.subject_id || a.subjectID || '') === String(sid))
      .sort((a,b)=>`${attendanceDate(b)} ${attendanceTime(b)}`.localeCompare(`${attendanceDate(a)} ${attendanceTime(a)}`));

    const body = document.getElementById('attendanceHistoryBody');
    if(!body) return;
    body.innerHTML = rows.length
      ? rows.map(a=>`<tr><td>${esc(attendanceDate(a)||'—')}</td><td class="subject-name">${esc(sub.get(subjectIdOf(a))?.name||subjectIdOf(a)||'—')}</td><td>${esc(attendanceTime(a)||'—')}</td><td><span class="present-badge">${esc(attendanceStatus(a)||'Present')}</span></td></tr>`).join('')
      : '<tr><td colspan="4" class="empty-attendance">No attendance records found.</td></tr>';
  }

  render();
});
