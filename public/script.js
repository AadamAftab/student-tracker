// ===== AUTH UI CONTROL =====
function logoutUser() {
  localStorage.removeItem("studentTrackerUser");
  USER_ID = null;
  showAuth();
}

function showApp() {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";
}

function showAuth() {
  document.getElementById("authScreen").style.display = "flex";
  document.getElementById("appScreen").style.display = "none";
}

// ===== BUTTON HANDLERS =====
async function handleLogin() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const msg = document.getElementById("authMsg");

  msg.textContent = "Logging in...";

  const res = await login(email, password);

  if (res.userId) {
    msg.textContent = "Success!";
    showApp();
  } else {
    msg.textContent = res.error || "Login failed";
  }
}

async function handleSignup() {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const msg = document.getElementById("authMsg");

  msg.textContent = "Creating account...";

  const res = await signup(email, password);

  if (res.status === "created") {
    msg.textContent = "Account created! You can login.";
  } else {
    msg.textContent = res.error || "Signup failed";
  }
}

// ===== AUTH =====
let USER_ID = localStorage.getItem("studentTrackerUser");

if (!USER_ID) {
  USER_ID = "guest-" + crypto.randomUUID();
  localStorage.setItem("studentTrackerUser", USER_ID);
}

function setUser(id) {
  USER_ID = id;
  localStorage.setItem("studentTrackerUser", id);
}

// ===== AUTH CALLS =====
async function signup(email, password) {
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

async function login(email, password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.userId) {
    setUser(data.userId);
    showApp();
    await loadData();
  }

  return data;
}

// ===== GLOBAL DB =====
let db = { deadlines: [], attendance: [] };

// ===== FORMATTER =====
function formatDateTime(dt) {
  const date = new Date(dt);
  return date.toLocaleString();
}

// ===== LOAD DATA =====
async function loadData() {
  if (!USER_ID) return;

  try {
    const res = await fetch(`/api/data/${USER_ID}`);
    db = await res.json();
  } catch (err) {
    console.error("Load failed", err);
  }
  render();
}

// ===== SAVE DATA =====
async function saveData() {
  if (!USER_ID) {
    console.log("❌ No USER_ID");
    return;
  }

  console.log("✅ Saving for", USER_ID);

  try {
    await fetch(`/api/data/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(db),
    });
  } catch (err) {
    console.error("Save failed", err);
  }
}

// ===== ADD DEADLINE =====
function addDeadline() {
  const taskEl = document.getElementById("taskInput");
  const dateEl = document.getElementById("dateInput");

  const task = taskEl.value.trim();
  const datetime = dateEl.value;

  if (!task || !datetime) return;

  db.deadlines.push({
    task,
    datetime,
    done: false,
  });

  taskEl.value = "";
  dateEl.value = "";

  saveData();
  render();
}

// ===== DELETE DEADLINE =====
function deleteDeadline(taskName) {
  db.deadlines = db.deadlines.filter(d => d.task !== taskName);
  saveData();
  render();
}

// ===== ATTENDANCE HELPERS =====
function markPresentFor(subject) {
  let record = db.attendance.find(
    a => a.subject.toLowerCase() === subject.toLowerCase()
  );

  if (!record) return;

  record.present++;
  record.total++;

  saveData();
  render();
}

function markAbsentFor(subject) {
  let record = db.attendance.find(
    a => a.subject.toLowerCase() === subject.toLowerCase()
  );

  if (!record) return;

  record.total++;

  saveData();
  render();
}

function classesNeededToReach(p, t, target = 0.75) {
  if (t === 0) return 0;
  const need = (target * t - p) / (1 - target);
  return Math.max(0, Math.ceil(need));
}

function safeBunks(p, t, target = 0.75) {
  if (t === 0) return 0;

  // maximum classes you can skip while staying >= target
  let bunks = Math.floor(p / target - t);

  // numerical safety for floating point errors
  if (bunks < 0) bunks = 0;

  return bunks;
}

// ===== MARK PRESENT =====
function markPresent() {
  const subEl = document.getElementById("subjectInput");
  const subject = subEl.value.trim();
  if (!subject) return;

  let record = db.attendance.find(
    a => a.subject.toLowerCase() === subject.toLowerCase()
  );

  if (!record) {
    record = { subject, present: 0, total: 0 };
    db.attendance.push(record);
  }

  record.present++;
  record.total++;

  subEl.value = "";
  saveData();
  render();
}

// ===== MARK ABSENT =====
function markAbsent() {
  const subEl = document.getElementById("subjectInput");
  const subject = subEl.value.trim();
  if (!subject) return;

  let record = db.attendance.find(
    a => a.subject.toLowerCase() === subject.toLowerCase()
  );

  if (!record) {
    record = { subject, present: 0, total: 0 };
    db.attendance.push(record);
  }

  record.total++;

  subEl.value = "";
  saveData();
  render();
}

// ===== SORT DEADLINES =====
function getSortedDeadlines() {
  return [...db.deadlines].sort((a, b) => {
    const now = new Date();

    const da = new Date(a.datetime || a.date);
    const dbb = new Date(b.datetime || b.date);

    const aOver = da < now;
    const bOver = dbb < now;

    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;

    return da - dbb;
  });
}

// ===== RENDER =====
function renderAttendanceDashboard() {
  const box = document.getElementById("attendanceDashboard");
  if (!box) return;

  if (!db.attendance || db.attendance.length === 0) {
    box.innerHTML = "<h3>📊 Attendance Overview</h3><p>No data yet</p>";
    return;
  }

  let totalPresent = 0;
  let totalClasses = 0;

  db.attendance.forEach(a => {
    totalPresent += a.present;
    totalClasses += a.total;
  });

  const overall = totalClasses
    ? ((totalPresent / totalClasses) * 100).toFixed(1)
    : 0;

  const risk =
    overall < 75
      ? "🔴 At Risk"
      : overall < 85
      ? "🟡 Watch"
      : "🟢 Safe";

  box.innerHTML = `
    <h3>📊 Attendance Overview</h3>

    <div style="font-size:22px;font-weight:700;margin:6px 0;">
      ${overall}%
    </div>

    <div style="
      height:10px;
      background:#222;
      border-radius:999px;
      overflow:hidden;
      margin-bottom:8px;
    ">
      <div style="
        width:${overall}%;
        height:100%;
        background:linear-gradient(90deg,#6c8cff,#9b6cff);
      "></div>
    </div>

    <div style="color:#9aa3ad;font-size:13px;">
      Status: ${risk}
    </div>
  `;
}

function render() {
  renderDeadlines();
  renderAttendanceDashboard();
  renderAttendance();
}

// ===== RENDER DEADLINES =====
function renderDeadlines() {
  const list = document.getElementById("deadlineList");
  if (!list) return;

  list.innerHTML = "";

  getSortedDeadlines().forEach((d, index) => {
    const li = document.createElement("li");

    const due = new Date(d.datetime || d.date);
    if (due < new Date()) li.classList.add("overdue");

    li.innerHTML = `
      <span>
        ${d.task} —
        <small style="color:#9aa3ad">
          ${formatDateTime(d.datetime || d.date)}
        </small>
        • <span id="countdown-${index}">...</span>
      </span>
      <button onclick="deleteDeadline('${d.task}')">❌</button>
    `;

    list.appendChild(li);
  });

  startCountdowns();
}

// ===== COUNTDOWN ENGINE =====
let countdownInterval = null;

function startCountdowns() {
  if (countdownInterval) clearInterval(countdownInterval);

  function updateCountdowns() {
    const now = new Date();

    getSortedDeadlines().forEach((d, index) => {
      const el = document.getElementById(`countdown-${index}`);
      if (!el) return;

      const due = new Date(d.datetime || d.date);
      const diff = due - now;

      if (diff <= 0) {
        el.textContent = "Overdue";
        el.style.color = "#ff5c5c";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const mins = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60)
      );

      el.textContent = `${days}d ${hours}h ${mins}m left`;
      el.style.color = "";
    });
  }

  updateCountdowns();
  countdownInterval = setInterval(updateCountdowns, 1000);
}

// ===== RENDER ATTENDANCE =====
function renderAttendance() {
  const list = document.getElementById("attendanceList");
  if (!list) return;

  list.innerHTML = "";

  const uniqueMap = new Map();
  db.attendance.forEach(a => {
    uniqueMap.set(a.subject.toLowerCase(), a);
  });

  const uniqueAttendance = Array.from(uniqueMap.values());

  uniqueAttendance.forEach(a => {
    const attended = a.present;
    const total = a.total;
    const missed = Math.max(0, total - attended);

    const percent = total
      ? ((attended / total) * 100).toFixed(1)
      : 0;

    const need = classesNeededToReach(attended, total);
    const bunks = safeBunks(attended, total);

    const li = document.createElement("li");

    let predictionText = "";
    const pctNum = total ? (attended / total) * 100 : 0;

    if (pctNum < 75) {
      predictionText = `Attend ${need} more to reach 75%`;
      li.classList.add("low-attendance");
    } else if (bunks === 0) {
      predictionText = `⚠️ Attend next class to stay safe`;
      li.classList.add("good-attendance");
    } else {
      predictionText = `Can bunk ${bunks} classes safely`;
      li.classList.add("good-attendance");
    }

    li.innerHTML = `
  <div style="width:100%">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong>${a.subject}</strong>
      <span>${percent}%</span>
    </div>

    <div style="font-size:12px;color:#9aa3ad;margin:6px 0;">
      ✅ ${attended} &nbsp; • &nbsp;
      ❌ ${missed} &nbsp; • &nbsp;
      📚 ${total}
    </div>

    <div style="display:flex;gap:8px;margin-top:6px;">
      <button onclick="markPresentFor('${a.subject}')">✅ Present</button>
      <button onclick="markAbsentFor('${a.subject}')" class="secondary">
        ❌ Absent
      </button>
    </div>

    <div style="font-size:12px;color:#9aa3ad;margin-top:6px">
      ${predictionText}
    </div>
  </div>
`;

    list.appendChild(li);
  });
}
// ===== START =====
if (USER_ID) loadData();

// ===== START =====
window.addEventListener("DOMContentLoaded", () => {
  showAuth(); // always show login first
});