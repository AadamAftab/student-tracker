// ===== GRADE POINT SCALE =====
const GRADE_POINTS = { "A": 4.0, "A-": 3.7, "B+": 3.4, "B": 3.0, "B-": 2.7, "C+": 2.4, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0 };

function gradeToPoint(grade) { return GRADE_POINTS[grade] ?? 0; }

function calculateCGPA(courses = []) {
  if (!courses.length) return 0;
  let totalPoints = 0; let totalCredits = 0;
  courses.forEach(c => {
    totalPoints += gradeToPoint(c.grade) * (Number(c.credits) || 0);
    totalCredits += (Number(c.credits) || 0);
  });
  if (totalCredits === 0) return 0;
  return (totalPoints / totalCredits).toFixed(2);
}

function generateMotivation(cgpa) {
  if (cgpa >= 3.7) return "🔥 Elite performance. Target A in core subjects.";
  if (cgpa >= 3.3) return "🚀 Strong work. Focus on converting B+ to A-.";
  if (cgpa >= 3.0) return "⚠️ Good base. Prioritize weak subjects.";
  if (cgpa >= 2.5) return "📈 Recovery mode. Attend all classes.";
  return "🚨 Critical zone. Seek help early.";
}

function addCgpaCourse() {
  if (!db.cgpaRecords) db.cgpaRecords = [];
  const subject = document.getElementById("cgSubject").value.trim();
  const grade = document.getElementById("cgGrade").value;
  const creditsEl = document.getElementById("cgCredits");
  const credits = creditsEl ? Number(creditsEl.value) : 0;

  if (!subject || !grade || credits <= 0 || isNaN(credits)) return;
  db.cgpaRecords.push({ subject, grade, credits, time: Date.now() });

  document.getElementById("cgSubject").value = "";
  document.getElementById("cgGrade").value = "";
  if (creditsEl) creditsEl.value = "";
  saveData(); render();
}

function deleteCgpaCourse(subject) {
  db.cgpaRecords = db.cgpaRecords.filter(c => c.subject !== subject);
  saveData(); render();
}

function renderCGPA() {
  const box = document.getElementById("cgpaResult");
  const list = document.getElementById("cgpaHistory");
  if (!box || !list) return;

  if (!db.cgpaRecords) db.cgpaRecords = [];
  const validRecords = db.cgpaRecords.filter(c => c.credits && c.credits > 0);
  const cgpa = calculateCGPA(validRecords);
  const motivation = generateMotivation(Number(cgpa));

  box.innerHTML = `
    <div style="font-size:22px;font-weight:700;">CGPA: ${cgpa} / 4.00</div>
    <div style="color:#9aa3ad;margin-top:6px;">${motivation}</div>
  `;

  list.innerHTML = "";
  db.cgpaRecords.forEach(c => {
    const li = document.createElement("li");
    li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";
    const safeCredits = c.credits || "Broken";
    const safeSubject = c.subject.replace(/'/g, "\\'");
    li.innerHTML = `
      <span>${c.subject} — ${c.grade} (${safeCredits} cr)</span>
      <button onclick="deleteCgpaCourse('${safeSubject}')" style="background:transparent; border:none; cursor:pointer;">❌</button>
    `;
    list.appendChild(li);
  });
}

function formatDateTime(dt) { return new Date(dt).toLocaleString(); }

function addDeadline() {
  const taskEl = document.getElementById("taskInput");
  const dateEl = document.getElementById("dateInput");
  if (!taskEl || !dateEl) return;
  const task = taskEl.value.trim(); const datetime = dateEl.value;
  if (!task || !datetime) return;
  db.deadlines.push({ task, datetime, done: false });
  taskEl.value = ""; dateEl.value = "";
  saveData(); render();
}

function deleteDeadline(taskName) {
  db.deadlines = db.deadlines.filter(d => d.task !== taskName);
  saveData(); render();
}

function getSortedDeadlines() {
  return [...db.deadlines].sort((a, b) => {
    const now = new Date();
    const da = new Date(a.datetime || a.date);
    const dbb = new Date(b.datetime || b.date);
    const aOver = da < now; const bOver = dbb < now;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return da - dbb;
  });
}

function renderDeadlines() {
  const list = document.getElementById("deadlineList");
  if (!list) return;
  list.innerHTML = "";
  getSortedDeadlines().forEach((d, index) => {
    const li = document.createElement("li");
    if (new Date(d.datetime || d.date) < new Date()) li.classList.add("overdue");
    const safeTask = d.task.replace(/'/g, "\\'");
    li.innerHTML = `
      <span>${d.task} — <small style="color:#9aa3ad">${formatDateTime(d.datetime || d.date)}</small>
      • <span id="countdown-${index}">...</span></span>
      <button onclick="deleteDeadline('${safeTask}')" style="background:transparent; border:none; cursor:pointer;">❌</button>
    `;
    list.appendChild(li);
  });
  startCountdowns();
}

let countdownInterval = null;
function startCountdowns() {
  if (countdownInterval) clearInterval(countdownInterval);
  function updateCountdowns() {
    const now = new Date();
    getSortedDeadlines().forEach((d, index) => {
      const el = document.getElementById(`countdown-${index}`);
      if (!el) return;
      const diff = new Date(d.datetime || d.date) - now;
      if (diff <= 0) { el.textContent = "Overdue"; el.style.color = "#ff5c5c"; return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      el.textContent = `${days}d ${hours}h ${mins}m left`; el.style.color = "";
    });
  }
  updateCountdowns(); countdownInterval = setInterval(updateCountdowns, 1000);
}

function markPresentFor(subject) {
  let record = db.attendance.find(a => a.subject.toLowerCase() === subject.toLowerCase());
  if (!record) return; record.present++; record.total++; saveData(); render();
}

function markAbsentFor(subject) {
  let record = db.attendance.find(a => a.subject.toLowerCase() === subject.toLowerCase());
  if (!record) return; record.total++; saveData(); render();
}

function classesNeededToReach(p, t, target = 0.75) {
  if (t === 0) return 0;
  const need = (target * t - p) / (1 - target);
  return Math.max(0, Math.ceil(need));
}

function safeBunks(p, t, target = 0.75) {
  if (t === 0) return 0;
  let bunks = Math.floor(p / target - t);
  return bunks < 0 ? 0 : bunks;
}

function markPresent() {
  const subEl = document.getElementById("subjectInput"); if (!subEl) return;
  const subject = subEl.value.trim(); if (!subject) return;
  let record = db.attendance.find(a => a.subject.toLowerCase() === subject.toLowerCase());
  if (!record) { record = { subject, present: 0, total: 0 }; db.attendance.push(record); }
  record.present++; record.total++; subEl.value = ""; saveData(); render();
}

function markAbsent() {
  const subEl = document.getElementById("subjectInput"); if (!subEl) return;
  const subject = subEl.value.trim(); if (!subject) return;
  let record = db.attendance.find(a => a.subject.toLowerCase() === subject.toLowerCase());
  if (!record) { record = { subject, present: 0, total: 0 }; db.attendance.push(record); }
  record.total++; subEl.value = ""; saveData(); render();
}

function deleteSubject(subject) {
  const ok = confirm(`Delete ${subject}? This cannot be undone.`);
  if (!ok) return;
  db.attendance = db.attendance.filter(a => a.subject.toLowerCase() !== subject.toLowerCase());
  saveData(); render();
}

function renderAttendanceDashboard() {
  const box = document.getElementById("attendanceDashboard"); if (!box) return;
  if (!db.attendance || db.attendance.length === 0) { box.innerHTML = "<h3>📊 Attendance Overview</h3><p>No data yet</p>"; return; }
  let totalPresent = 0; let totalClasses = 0;
  db.attendance.forEach(a => { totalPresent += a.present; totalClasses += a.total; });
  const overall = totalClasses ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
  const risk = overall < 75 ? "🔴 At Risk" : overall < 85 ? "🟡 Watch" : "🟢 Safe";
  box.innerHTML = `
    <h3>📊 Attendance Overview</h3>
    <div style="font-size:22px;font-weight:700;margin:6px 0;">${overall}%</div>
    <div style="height:10px; background:#222; border-radius:999px; overflow:hidden; margin-bottom:8px;">
      <div style="width:${overall}%; height:100%; background:linear-gradient(90deg,#6c8cff,#9b6cff);"></div>
    </div>
    <div style="color:#9aa3ad;font-size:13px;">Status: ${risk}</div>
  `;
}

function renderAttendance() {
  const list = document.getElementById("attendanceList"); if (!list) return;
  list.innerHTML = "";
  db.attendance.forEach(a => {
    const attended = a.present; const total = a.total; const missed = Math.max(0, total - attended);
    const percent = total ? ((attended / total) * 100).toFixed(1) : 0;
    const need = classesNeededToReach(attended, total); const bunks = safeBunks(attended, total);
    const li = document.createElement("li");
    let predictionText = ""; const pctNum = total ? (attended / total) * 100 : 0;
    if (pctNum < 75) { predictionText = `Attend ${need} more to reach 75%`; li.classList.add("low-attendance"); }
    else if (bunks === 0) { predictionText = `⚠️ Attend next class to stay safe`; li.classList.add("good-attendance"); }
    else { predictionText = `Can bunk ${bunks} classes safely`; li.classList.add("good-attendance"); }
    const safeSubject = a.subject.replace(/'/g, "\\'");
    li.innerHTML = `
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong onclick="openSubject('${safeSubject}')" style="cursor:pointer">${a.subject}</strong>
          <span>${percent}%</span>
        </div>
        <div style="font-size:12px;color:#9aa3ad;margin:6px 0;">✅ ${attended} • ❌ ${missed} • 📚 ${total}</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <button onclick="markPresentFor('${safeSubject}')">✅ Present</button>
          <button onclick="markAbsentFor('${safeSubject}')" class="secondary">❌ Absent</button>
          <button onclick="deleteSubject('${safeSubject}')" class="secondary">🗑 Delete</button>
        </div>
        <div style="font-size:12px;color:#9aa3ad;margin-top:6px">${predictionText}</div>
      </div>
    `;
    list.appendChild(li);
  });
}

function openSubject(subject) {
  const encoded = encodeURIComponent(subject);
  window.location.href = `subject.html?name=${encoded}`;
}

let db = { deadlines: [], attendance: [], cgpaRecords: [] };

function render() { renderDeadlines(); renderAttendanceDashboard(); renderAttendance(); renderCGPA(); }

async function loadData() {
  if (!USER_ID) return;
  try {
    const res = await fetch(`/api/data/${USER_ID}`);
    const data = await res.json();
    db = { deadlines: data.deadlines || [], attendance: data.attendance || [], cgpaRecords: data.cgpaRecords || [] };
  } catch (err) { console.error("Load failed", err); }
  render();
}

async function saveData() {
  if (!USER_ID) return;
  try { await fetch(`/api/data/${USER_ID}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(db) }); }
  catch (err) { console.error("Save failed", err); }
}

let USER_ID = localStorage.getItem("studentTrackerUser");
function setUser(id) { USER_ID = id; localStorage.setItem("studentTrackerUser", id); }

function logoutUser() {
  localStorage.removeItem("studentTrackerUser"); USER_ID = null;
  db = { deadlines: [], attendance: [], cgpaRecords: [] };
  document.getElementById("appScreen").style.display = "none";
  document.getElementById("authScreen").style.display = "flex";
}

async function handleLogin() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const msg = document.getElementById("authMsg");
  msg.textContent = "Logging in...";
  const res = await login(email, password);
  if (res.userId) {
    msg.textContent = "Success!";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
  } else { msg.textContent = res.error || "Login failed"; }
}

async function handleSignup() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const msg = document.getElementById("authMsg");
  msg.textContent = "Creating account...";
  const res = await signup(email, password);
  if (res.status === "created") { msg.textContent = "Account created! You can login."; }
  else { msg.textContent = res.error || "Signup failed"; }
}

async function signup(email, password) {
  const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return await res.json();
}
async function login(email, password) {
  const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (data.userId) { setUser(data.userId); await loadData(); }
  return data;
}

window.addEventListener("DOMContentLoaded", async () => {
  if (USER_ID) {
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
    await loadData();
  } else {
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
  }
});

