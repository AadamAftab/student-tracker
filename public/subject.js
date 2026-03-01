let USER_ID = localStorage.getItem("studentTrackerUser");
let db = {};

function goBack() {
  window.location.href = "/";
}

function getSubjectFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("name");
}

async function loadData() {
  if (!USER_ID) return;

  const res = await fetch(`/api/data/${USER_ID}`);
  db = await res.json();

  renderSubject();
}

function renderSubject() {
  const subject = getSubjectFromURL();
  const title = document.getElementById("subjectTitle");
  const box = document.getElementById("subjectStats");

  if (!subject) return;

  title.textContent = `📘 ${subject}`;

  const record = db.attendance.find(
    a => a.subject.toLowerCase() === subject.toLowerCase()
  );

  if (!record) {
    box.innerHTML = "<p>No data for this subject</p>";
    return;
  }

  const p = record.present;
  const t = record.total;
  const missed = t - p;
  const percent = t ? ((p / t) * 100).toFixed(1) : 0;

  const bunks = Math.max(0, Math.floor(p / 0.75 - t));
  const need = Math.max(0, Math.ceil((0.75 * t - p) / (1 - 0.75)));

  const nextMiss = (((p) / (t + 1)) * 100).toFixed(1);
  const nextAttend = (((p + 1) / (t + 1)) * 100).toFixed(1);

  const risk =
    percent < 75 ? "🔴 At Risk" :
    percent < 85 ? "🟡 Watch" :
    "🟢 Safe";

  box.innerHTML = `
    <h3>${percent}% — ${risk}</h3>

    <p>✅ Attended: ${p}</p>
    <p>❌ Missed: ${missed}</p>
    <p>📚 Total: ${t}</p>

    <hr style="opacity:.2;margin:12px 0;">

    <p>🎯 Can bunk: <b>${bunks}</b></p>
    <p>🚨 Need to attend: <b>${need}</b></p>

    <hr style="opacity:.2;margin:12px 0;">

    <p>🔮 If miss next → ${nextMiss}%</p>
    <p>🔮 If attend next → ${nextAttend}%</p>
  `;
}

loadData();