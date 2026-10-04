import {auth,db} from './firebase-config.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {collection,getDocs,doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {norm,clean,esc,branchOf,classOf,studentIdOf,rollNoOf,subjectIdOf,formatTime,timeMin,indiaDate,indiaDay,formatDisplayDate,attendanceDate,attendanceStudentId,attendanceStatus,attendanceTime} from './attendix-utils.js';

const $=id=>document.getElementById(id);
async function load(){
  const [ss,ts,subs,tts,atts]=await Promise.all([
    getDocs(collection(db,'students')),getDocs(collection(db,'teachers')),getDocs(collection(db,'subjects')),
    getDocs(collection(db,'timetable')),getDocs(collection(db,'attendance'))
  ]);
  const students=ss.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.active!==false);
  const teachers=ts.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.active!==false);
  const subjects=subs.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.active!==false);
  const timetable=tts.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.active!==false);
  const attendance=atts.docs.map(d=>({id:d.id,...d.data()}));
  const subjectMap=new Map(subjects.map(s=>[s.id,s]));
  const teacherMap=new Map(teachers.map(t=>[t.id,t]));
  const today=indiaDate(), day=indiaDay();

  $('totalStudents') && ($('totalStudents').textContent=students.length);
  $('totalTeachers') && ($('totalTeachers').textContent=teachers.length);
  const todayPresent=new Set(attendance.filter(a=>attendanceDate(a)===today&&norm(attendanceStatus(a))==='present').map(attendanceStudentId).filter(Boolean));
  $('presentToday') && ($('presentToday').textContent=todayPresent.size);
  $('presentSubtext') && ($('presentSubtext').textContent=students.length?`${((todayPresent.size/students.length)*100).toFixed(1)}% attendance`:'0.0% attendance');
  $('attendanceRate') && ($('attendanceRate').textContent=students.length?`${((todayPresent.size/students.length)*100).toFixed(1)}%`:'0.0%');

  const classes=timetable.filter(t=>norm(t.day)===norm(day)).sort((a,b)=>(timeMin(a.startTime)||0)-(timeMin(b.startTime)||0));
  const cb=$('todayClassesTable');
  if(cb) cb.innerHTML=classes.length?classes.map(t=>{
    const subj=subjectMap.get(subjectIdOf(t)); const teacher=teacherMap.get(clean(t.teacherUid));
    const now=new Date().toLocaleTimeString('en-US',{hour12:false});
    const n= timeMin(now), st=timeMin(t.startTime), en=timeMin(t.endTime);
    const status=n!=null&&st!=null&&en!=null?(n<st?'Scheduled':n>en?'Completed':'Live'):'Scheduled';
    return `<tr><td>${esc(formatTime(t.startTime))} – ${esc(formatTime(t.endTime))}</td><td><strong>${esc(subj?.name||subj?.code||subjectIdOf(t)||'Unknown Subject')}</strong></td><td>${esc(teacher?.name||t.teacherUid||'Unassigned')}</td><td>${esc(t.branch||'')}</td><td>${esc(t.room||'—')}</td><td>${esc(t.type||'Lecture')}</td><td>${esc(status)}</td></tr>`;
  }).join(''):'<tr><td colspan="7" style="text-align:center;">No classes scheduled today.</td></tr>';

  const groups=new Map(); for(const s of students){const key=`${branchOf(s)}|${classOf(s)}`;if(!groups.has(key))groups.set(key,{branch:branchOf(s)||'—',year:classOf(s)||'—',students:[]});groups.get(key).students.push(s);}
  const bt=$('branchAttendanceTable');
  if(bt) bt.innerHTML=[...groups.values()].map(g=>{const ids=new Set(g.students.map(studentIdOf));const present=[...todayPresent].filter(id=>ids.has(id)).length;const total=g.students.length;const rate=total?present*100/total:0;const st=rate>=75?'Good':rate>0?'Needs Attention':'No Attendance';return `<tr><td>${esc(g.branch)}</td><td>${esc(g.year)}</td><td>${total}</td><td>${present}</td><td>${Math.max(total-present,0)}</td><td>${rate.toFixed(1)}%</td><td>${esc(st)}</td></tr>`;}).join('')||'<tr><td colspan="7" style="text-align:center;">No students found.</td></tr>';
}
async function guard(){onAuthStateChanged(auth,async user=>{if(!user){location.replace('../index.html');return;}try{const u=await getDoc(doc(db,'users',user.uid));const role=norm(u.data()?.role);if(role!=='admin'){location.replace(role==='teacher'?'teacher.html':role==='student'?'student-dashboard.html':'../index.html');return;}const d=u.data();const name=d.name||user.email||'Admin';$('userName')&&($('userName').textContent=name);$('userRole')&&($('userRole').textContent='Administrator');$('userAvatar')&&($('userAvatar').textContent=name.charAt(0).toUpperCase());$('welcomeMessage')&&($('welcomeMessage').textContent=`Welcome back, ${name}`);await load();}catch(e){console.error(e);const area=$('branchAttendanceTable');if(area)area.innerHTML=`<tr><td colspan="7" style="text-align:center;color:#dc2626;">Failed to load dashboard.</td></tr>`;}});}
$('logoutBtn')?.addEventListener('click',()=>signOut(auth).then(()=>location.replace('../index.html')));
guard();
