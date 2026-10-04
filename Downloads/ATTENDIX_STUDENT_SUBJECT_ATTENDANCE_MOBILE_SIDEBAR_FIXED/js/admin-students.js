import {auth,db} from './firebase-config.js';
import {collection,getDocs,addDoc,updateDoc,deleteDoc,doc,setDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {norm,clean,esc,field,studentIdOf,rollNoOf,rfidOf,branchOf,classOf,batchOf,attendanceDate,attendanceStudentId,attendanceStatus,attendanceTime,indiaDate,dateRange,computeStudentAttendance} from './attendix-utils.js';

const $=id=>document.getElementById(id); let students=[],attendance=[],timetable=[],editingId=null;
const today=indiaDate(), monthStart=`${today.slice(0,7)}-01`;
async function load(){
  const [s,a,t]=await Promise.all([getDocs(collection(db,'students')),getDocs(collection(db,'attendance')),getDocs(collection(db,'timetable'))]);
  students=s.docs.map(d=>({id:d.id,...d.data()})); attendance=a.docs.map(d=>({id:d.id,...d.data()})); timetable=t.docs.map(d=>({id:d.id,...d.data()}));
  populateFilters(); render(); updateStats();
}
function populateFilters(){
  const years=new Set(), branches=new Set(), batches=new Set(); students.forEach(s=>{if(classOf(s))years.add(classOf(s));if(branchOf(s))branches.add(branchOf(s));if(batchOf(s))batches.add(batchOf(s));});
  const add=(id,vals,label)=>{const e=$(id);if(!e)return;const keep=e.value;e.innerHTML=`<option value="">${label}</option>`;[...vals].sort().forEach(v=>e.insertAdjacentHTML('beforeend',`<option value="${esc(v)}">${esc(v)}</option>`));e.value=keep;};
  add('yearFilter',years,'All Years');add('branchFilter',branches,'All Branches');add('batchFilter',batches,'All Batches');
}
function statsFor(s){return computeStudentAttendance(s,timetable,attendance,monthStart,today);}
function updateStats(){const active=students.filter(s=>s.active!==false);const reps=active.map(statsFor);$('totalStudents')&&($('totalStudents').textContent=active.length);const withClasses=reps.filter(r=>r.total>0);const good=withClasses.filter(r=>r.pct>=75).length;const low=withClasses.filter(r=>r.pct<50).length;const avg=withClasses.filter(r=>r.pct>=50&&r.pct<75).length;const averagePct=withClasses.length?withClasses.reduce((x,r)=>x+r.pct,0)/withClasses.length:0;$('goodAttendance')&&($('goodAttendance').textContent=good);$('lowAttendance')&&($('lowAttendance').textContent=low);$('averageAttendance')&&($('averageAttendance').textContent=withClasses.length?averagePct.toFixed(1)+'%':'0.0%');}
function render(){let rows=students.filter(s=>s.active!==false);const q=norm($('searchInput')?.value), y=norm($('yearFilter')?.value), b=norm($('branchFilter')?.value), ba=norm($('batchFilter')?.value);rows=rows.filter(s=>(!q||[s.name,rollNoOf(s),s.email,rfidOf(s),studentIdOf(s)].some(v=>norm(v).includes(q)))&&(!y||norm(classOf(s))===y)&&(!b||norm(branchOf(s))===b)&&(!ba||norm(batchOf(s))===ba));const body=$('studentsTableBody');if(!body)return;if(!rows.length){body.innerHTML=`<tr><td colspan="9" style="text-align:center;">${students.length?'No students match the selected filters.':'No students registered yet.'}</td></tr>`;return;}body.innerHTML=rows.sort((a,b)=>String(rollNoOf(a)).localeCompare(String(rollNoOf(b)),undefined,{numeric:true})).map(s=>{const r=statsFor(s), last=attendance.filter(a=>attendanceStudentId(a)===studentIdOf(s)).sort((a,b)=>`${attendanceDate(b)} ${attendanceTime(b)}`.localeCompare(`${attendanceDate(a)} ${attendanceTime(a)}`))[0];const pct=r.total?r.pct:0;return `<tr><td>${esc(rollNoOf(s)||'—')}</td><td><strong>${esc(s.name||'Unknown')}</strong></td><td>${esc(branchOf(s)||'—')}</td><td>${esc(classOf(s)||'—')}</td><td><span class="batch-badge">${esc(batchOf(s)||'—')}</span></td><td>${r.total?pct.toFixed(1)+'%':'0.0%'}</td><td>${last?esc(`${attendanceDate(last)} ${attendanceTime(last)}`):'Never'}</td><td><span class="badge badge-good">${s.active===false?'Inactive':'Active'}</span></td><td><button type="button" class="btn btn-secondary btn-sm edit-student-btn" data-id="${esc(s.id)}">Edit</button> <button type="button" class="btn btn-danger btn-sm delete-student-btn" data-id="${esc(s.id)}">Delete</button></td></tr>`;}).join('');}
function getForm(){return {name:clean($('studentName')?.value),rollNo:clean($('studentRollNo')?.value),email:clean($('studentEmail')?.value),className:clean($('studentClass')?.value),branch:clean($('studentDepartment')?.value),batch:clean($('studentBatch')?.value).toUpperCase(),rfidUid:clean($('studentRfid')?.value).replace(/\s+/g,' ').toUpperCase(),active:!!$('studentActive')?.checked};}
function openModal(id=null){editingId=id;$('studentFormError')&&($('studentFormError').hidden=true);if(id){const s=students.find(x=>x.id===id);if(!s)return;$('studentName').value=s.name||'';$('studentRollNo').value=rollNoOf(s);$('studentEmail').value=s.email||'';$('studentClass').value=classOf(s);$('studentDepartment').value=branchOf(s);$('studentBatch').value=batchOf(s);$('studentRfid').value=rfidOf(s);$('studentActive').checked=s.active!==false;$('studentModalTitle').textContent='Edit Student';$('saveStudentBtn').textContent='Update Student';}else{$('studentForm')?.reset();$('studentActive')&&($('studentActive').checked=true);$('studentModalTitle').textContent='Add Student';$('saveStudentBtn').textContent='Add Student';}$('studentModal')?.removeAttribute('hidden');$('studentModal')?.classList.add('show');}
function closeModal(){$('studentModal')?.setAttribute('hidden','true');$('studentModal')?.classList.remove('show');editingId=null;}
async function save(e){e.preventDefault();const d=getForm();if(!d.name||!d.rollNo||!d.className||!d.branch||!d.batch){$('studentFormError')&&(($('studentFormError').textContent='Name, Roll No, Class, Branch and Batch are required.'),$('studentFormError').hidden=false);return;}try{$('saveStudentBtn').disabled=true;if(editingId){await updateDoc(doc(db,'students',editingId),{name:d.name,rollNo:d.rollNo,email:d.email,class:d.className,branch:d.branch,batch:d.batch,rfidUid:d.rfidUid,active:d.active});}else{let next=1;for(const s of students){const m=studentIdOf(s).match(/^STU(\d+)$/i);if(m)next=Math.max(next,+m[1]+1);}const sid=`STU${String(next).padStart(3,'0')}`;await setDoc(doc(db,'students',sid),{studentId:sid,name:d.name,rollNo:d.rollNo,email:d.email,class:d.className,branch:d.branch,batch:d.batch,rfidUid:d.rfidUid,active:d.active});}closeModal();await load();}catch(err){console.error(err);if($('studentFormError')){$('studentFormError').textContent=err.message||'Failed to save student.';$('studentFormError').hidden=false;}}finally{$('saveStudentBtn').disabled=false;}}
async function remove(id){const s=students.find(x=>x.id===id);if(!s||!confirm(`Delete ${s.name||'this student'}?`))return;try{await deleteDoc(doc(db,'students',id));await load();}catch(e){console.error(e);alert('Failed to delete student.');}}
$('addStudentBtn')?.addEventListener('click',()=>openModal());$('closeStudentModal')?.addEventListener('click',closeModal);$('cancelStudentBtn')?.addEventListener('click',closeModal);$('studentForm')?.addEventListener('submit',save);$('searchInput')?.addEventListener('input',render);$('yearFilter')?.addEventListener('change',render);$('branchFilter')?.addEventListener('change',render);$('batchFilter')?.addEventListener('change',render);$('studentsTableBody')?.addEventListener('click',e=>{const ed=e.target.closest('.edit-student-btn'),del=e.target.closest('.delete-student-btn');if(ed)openModal(ed.dataset.id);if(del)remove(del.dataset.id);});
onAuthStateChanged(auth,u=>{if(!u)return;load().catch(e=>console.error(e));});

// Excel import/export and batch sorting support (keeps the existing UI buttons working).
function downloadCsvFile(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'}));
  a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('downloadStudentTemplateBtn')?.addEventListener('click', () => {
  const rows = [['name','rollNo','email','class','batch','branch','rfidUid','active'],['Rahul Patil','02','rahul@example.com','Third Year','B1','AI and Data Science','','true']];
  if (window.XLSX) {
    const ws=window.XLSX.utils.aoa_to_sheet(rows), wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,'Students'); window.XLSX.writeFile(wb,'ATTENDIX_Student_Import_Template.xlsx');
  } else downloadCsvFile('ATTENDIX_Student_Import_Template.csv',rows);
});
$('importStudentsBtn')?.addEventListener('click',()=> $('studentExcelInput')?.click());
$('studentExcelInput')?.addEventListener('change', async e => {
  const file=e.target.files?.[0]; if(!file)return;
  try {
    if(!window.XLSX) throw new Error('Excel importer is not available. Refresh the page and try again.');
    const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; const rows=window.XLSX.utils.sheet_to_json(ws,{defval:''});
    if(!rows.length) throw new Error('The Excel sheet is empty.');
    const existingRolls=new Set(students.map(s=>norm(rollNoOf(s)))); const existingRfids=new Set(students.map(s=>rfidOf(s)).filter(Boolean)); const records=[]; const errors=[];
    rows.forEach((r,i)=>{const name=clean(r.name||r['Student Name']);const rollNo=clean(r.rollNo||r.roll_no||r['Roll No']);const email=clean(r.email||r.Email);const cls=clean(r.class||r.year||r['Class / Year']);const batch=clean(r.batch||r.Batch).toUpperCase();const branch=clean(r.branch||r.department||r.Department);const rfid=clean(r.rfidUid||r.rfid_uid||r['RFID UID']).replace(/\s+/g,' ').toUpperCase();if(!name||!rollNo||!cls||!batch||!branch)errors.push(`Row ${i+2}: name, rollNo, class, batch and branch are required.`);else if(existingRolls.has(norm(rollNo)))errors.push(`Row ${i+2}: duplicate roll number ${rollNo}.`);else if(rfid&&existingRfids.has(rfid))errors.push(`Row ${i+2}: duplicate RFID ${rfid}.`);else records.push({name,rollNo,email,class:cls,batch,branch,rfidUid:rfid,active:String(r.active??'true').toLowerCase()!=='false'});existingRolls.add(norm(rollNo));if(rfid)existingRfids.add(rfid);});
    if(errors.length)throw new Error(errors.slice(0,8).join('\n'));
    let next=1; students.forEach(s=>{const m=studentIdOf(s).match(/^STU(\d+)$/i);if(m)next=Math.max(next,+m[1]+1);});
    const b=writeBatch(db); for(const rec of records){const sid=`STU${String(next++).padStart(3,'0')}`;b.set(doc(db,'students',sid),{studentId:sid,...rec});}
    await b.commit(); await load(); alert(`Imported ${records.length} students successfully.`);
  } catch(err){console.error(err);alert(err.message||'Import failed.');} finally{e.target.value='';}
});
$('sortBatchBtn')?.addEventListener('click',()=>{ $('batchSortModal')?.removeAttribute('hidden'); $('batchSortModal')?.classList.add('show'); });
$('closeBatchSortModal')?.addEventListener('click',()=>{$('batchSortModal')?.setAttribute('hidden','true');$('batchSortModal')?.classList.remove('show');});
$('cancelBatchSortBtn')?.addEventListener('click',()=>{$('batchSortModal')?.setAttribute('hidden','true');$('batchSortModal')?.classList.remove('show');});
$('batchSortForm')?.addEventListener('submit',async e=>{e.preventDefault();const batch=clean($('sortBatchName')?.value).toUpperCase(),start=Number($('sortStartRoll')?.value),end=Number($('sortEndRoll')?.value);if(!batch||!Number.isFinite(start)||!Number.isFinite(end)||start>end){$('batchSortStatus')&&($('batchSortStatus').textContent='Enter a valid batch and roll range.');return;}try{const b=writeBatch(db);let count=0;students.forEach(s=>{const r=Number(String(rollNoOf(s)).replace(/\D/g,''));if(r>=start&&r<=end){b.update(doc(db,'students',s.id),{batch});count++;}});await b.commit();$('batchSortStatus')&&($('batchSortStatus').textContent=`Updated ${count} student${count===1?'':'s'}.`);await load();}catch(err){console.error(err);$('batchSortStatus')&&($('batchSortStatus').textContent=err.message||'Batch update failed.');}});
