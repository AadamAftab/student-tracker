const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const DB_FILE = "./data/db.json";

// ---------- helpers ----------
function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ================= AUTH =================

// signup
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  if (db.accounts[email]) {
    return res.status(400).json({ error: "Account exists" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.accounts[email] = { password: hash };
  db.users[email] = { deadlines: [], attendance: [], cgpaRecords: [] };

  writeDB(db);
  res.json({ status: "created" });
});

// login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const account = db.accounts[email];
  if (!account) {
    return res.status(400).json({ error: "No account" });
  }

  const ok = await bcrypt.compare(password, account.password);
  if (!ok) {
    return res.status(400).json({ error: "Wrong password" });
  }

  res.json({ status: "ok", userId: email });
});

// ================= DATA =================

app.get("/api/data/:userId", (req, res) => {
  const db = readDB();
  const userId = req.params.userId;

  res.json(db.users[userId] || { deadlines: [], attendance: [], cgpaRecords: [], });
});

app.post("/api/data/:userId", (req, res) => {
  const db = readDB();
  const userId = req.params.userId;

  db.users[userId] = req.body;
  writeDB(db);

  res.json({ status: "saved" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);