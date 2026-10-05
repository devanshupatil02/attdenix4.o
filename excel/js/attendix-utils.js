export const norm = (v) => String(v ?? "").trim().toLowerCase();
export const clean = (v) => String(v ?? "").trim();

export const esc = (v) => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

export function field(obj, ...names) {
  for (const name of names) {
    const value = obj?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

export const studentIdOf = s => clean(field(s,"studentId","student_id")) || clean(s?.id);
export const rollNoOf = s => clean(field(s,"rollNo","roll_no"));
export const rfidOf = s => clean(field(s,"rfidUid","rfid_uid")).replace(/\s+/g," ").toUpperCase();
export const branchOf = s => clean(field(s,"branch","department","dept"));
export const classOf = s => clean(field(s,"class","className","year"));
export const batchOf = s => clean(field(s,"batch","division"));
export const teacherUidOf = t => clean(field(t,"uid","teacherUid")) || clean(t?.id);
export const subjectIdOf = s => clean(field(s,"subjectId","subjectID","subject_id")) || clean(s?.id);

export function indiaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
}
export function indiaDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Kolkata", weekday:"long" }).format(date);
}
export function formatDisplayDate(value) {
  const s = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "";
  const d = new Date(`${s}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric", timeZone:"Asia/Kolkata" }).format(d);
}
export function dateRange(start,end){
  const out=[]; if(!start||!end) return out;
  const d=new Date(`${start}T00:00:00`), e=new Date(`${end}T00:00:00`);
  for(;d<=e;d.setDate(d.getDate()+1)) out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  return out;
}

export function timeMin(value){
  if(value==null||value==="") return null;
  if(typeof value?.toDate === "function") value=value.toDate();
  if(value instanceof Date && !Number.isNaN(value.getTime())) return value.getHours()*60+value.getMinutes();
  const s=String(value).trim().toUpperCase();
  let m=s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)$/);
  if(m){let h=+m[1],n=+(m[2]||0);if(m[3]==='PM'&&h<12)h+=12;if(m[3]==='AM'&&h===12)h=0;return h*60+n;}
  m=s.match(/^(\d{1,2}):([0-5]\d)$/); if(m) return +m[1]*60 + +m[2];
  return null;
}
export const formatTime = value => { const n=timeMin(value); if(n==null) return clean(value)||"—"; const h=Math.floor(n/60),m=String(n%60).padStart(2,'0'); return `${h%12||12}:${m} ${h>=12?'PM':'AM'}`; };

export function sameBranch(a,b){return norm(a)===norm(b) || (!clean(a)||!clean(b));}
export function canonicalClass(v){const s=norm(v).replace(/\s+/g,' '); const m=s.match(/\b(1|2|3|4)(?:st|nd|rd|th)?\b/); if(m) return m[1]; if(s.includes('first')) return '1'; if(s.includes('second')) return '2'; if(s.includes('third')) return '3'; if(s.includes('fourth')) return '4'; return s;}
export function sameClass(a,b){return canonicalClass(a)===canonicalClass(b) || (!clean(a)||!clean(b));}

export function subjectNameFor(id, subjectsMap){
  const key=clean(id); if(!key) return "";
  const s=subjectsMap.get(key); return s?.name || s?.code || key;
}

export function attendanceStatus(record){ return norm(field(record,"status")) || "present"; }
export function attendanceStudentId(record){ return clean(field(record,"studentId","student_id")); }
export function attendanceSubjectId(record){ return clean(field(record,"subjectId","subject_id","subjectID")); }
export function attendanceTeacherUid(record){ return clean(field(record,"teacherUid","teacher_uid")); }
export function attendanceTimetableId(record){ return clean(field(record,"timetableId","timetable_id")); }
export function attendanceDate(record){ return clean(field(record,"date","attendanceDate")); }
export function attendanceTime(record){ return clean(field(record,"time","scanTime","scan_time")); }

export function sessionKey(date,t){ return `${date}|${t.id}|${subjectIdOf(t)}|${formatTime(t.startTime)}|${formatTime(t.endTime)}`; }
export function recordMatchesSession(record,date,t){
  if(attendanceDate(record)!==date) return false;
  const rid=attendanceTimetableId(record); if(rid && rid===t.id) return true;
  const sid=attendanceSubjectId(record); const tsid=subjectIdOf(t);
  if(sid && tsid && sid===tsid){
    const rt=timeMin(attendanceTime(record)), st=timeMin(t.startTime); return rt==null || st==null || Math.abs(rt-st)<=60;
  }
  return !sid && !tsid;
}
export function scheduledForStudent(t,student){ return t.active!==false && sameBranch(t.branch,branchOf(student)) && sameClass(t.class,classOf(student)); }

export function computeStudentAttendance(student, timetable, attendance, startDate, endDate, subjectId=""){
  const sessions=[];
  for(const date of dateRange(startDate,endDate)){
    const day=dayNameForDate(date);
    for(const t of timetable){
      if(t.active===false) continue;
      if(norm(t.day)!==norm(day)) continue;
      if(!scheduledForStudent(t,student)) continue;
      if(subjectId && subjectIdOf(t)!==subjectId) continue;
      sessions.push({date,t});
    }
  }
  const presentKeys=new Set();
  const studentAtt=attendance.filter(r=>attendanceStudentId(r)===studentIdOf(student) && norm(attendanceStatus(r))==='present');
  for(const s of sessions){ if(studentAtt.some(r=>recordMatchesSession(r,s.date,s.t))) presentKeys.add(sessionKey(s.date,s.t)); }
  const total=sessions.length, present=presentKeys.size, absent=Math.max(0,total-present), pct=total?present*100/total:0;
  return {total,present,absent,pct,sessions,studentAtt};
}
export function dayNameForDate(dateStr){ return new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'Asia/Kolkata'}).format(new Date(`${dateStr}T12:00:00+05:30`)); }
