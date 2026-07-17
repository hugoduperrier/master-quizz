const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || "prof2026"; // <-- vous pouvez changer ce code ici, ou via une variable d'environnement ADMIN_CODE sur votre hébergeur

const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');

function loadSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function saveSubmissions(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function requireAdmin(req, res, next) {
  const code = req.headers['x-admin-code'] || req.query.code;
  if (code !== ADMIN_CODE) {
    return res.status(401).json({ error: "Code administrateur invalide." });
  }
  next();
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- Student submission ---
app.post('/api/submit', (req, res) => {
  const { firstName, lastName, totalMax, questions, answers } = req.body || {};
  if (!firstName || !lastName || !answers || !questions) {
    return res.status(400).json({ error: "Données incomplètes." });
  }
  const submissions = loadSubmissions();
  const record = {
    id: crypto.randomUUID(),
    firstName: String(firstName).trim().slice(0, 100),
    lastName: String(lastName).trim().slice(0, 100),
    submittedAt: new Date().toISOString(),
    totalMax: Number(totalMax) || 0,
    questions, // static metadata (prompt, cat, type, max points) for display
    answers    // { [qid]: { text, earned, max, needsManualGrade, comment } }
  };
  submissions.push(record);
  saveSubmissions(submissions);
  res.json({ ok: true, id: record.id });
});

// --- Admin: list all submissions ---
app.get('/api/submissions', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  res.json(submissions);
});

// --- Admin: update a manual grade / comment for one question ---
app.post('/api/grade', requireAdmin, (req, res) => {
  const { id, qid, earned, comment } = req.body || {};
  const submissions = loadSubmissions();
  const sub = submissions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: "Réponse introuvable." });
  if (!sub.answers[qid]) return res.status(404).json({ error: "Question introuvable." });
  const max = sub.answers[qid].max || 0;
  sub.answers[qid].earned = Math.max(0, Math.min(Number(earned) || 0, max));
  sub.answers[qid].comment = comment || "";
  sub.answers[qid].needsManualGrade = false;
  saveSubmissions(submissions);
  res.json({ ok: true, submission: sub });
});

// --- Admin: delete a submission (e.g. a test run) ---
app.delete('/api/submissions/:id', requireAdmin, (req, res) => {
  let submissions = loadSubmissions();
  submissions = submissions.filter(s => s.id !== req.params.id);
  saveSubmissions(submissions);
  res.json({ ok: true });
});

// --- Admin: CSV export ---
app.get('/api/export.csv', (req, res) => {
  if (req.query.code !== ADMIN_CODE) return res.status(401).send("Code administrateur invalide.");
  const submissions = loadSubmissions();
  if (submissions.length === 0) return res.send("Nom,Prénom,Date,Score,Score max\n");

  const qIds = submissions[0].questions.map(q => q.id);
  const header = ["Nom", "Prénom", "Date", ...submissions[0].questions.map(q => `Q${q.num} (${q.max}pts)`), "Total", "Total max"];
  const rows = [header];

  submissions.forEach(s => {
    const total = qIds.reduce((sum, qid) => sum + (s.answers[qid] ? s.answers[qid].earned : 0), 0);
    const row = [
      s.lastName, s.firstName, new Date(s.submittedAt).toLocaleString('fr-FR'),
      ...qIds.map(qid => s.answers[qid] ? s.answers[qid].earned : 0),
      total, s.totalMax
    ];
    rows.push(row);
  });

  const csv = rows.map(r => r.map(cell => {
    const str = String(cell).replace(/"/g, '""');
    return /[",;\n]/.test(str) ? `"${str}"` : str;
  }).join(";")).join("\n");

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="master_quiz_resultats.csv"');
  res.send("\uFEFF" + csv); // BOM for Excel accented-character compatibility
});

app.listen(PORT, () => console.log(`Master Quiz server running on port ${PORT}`));
