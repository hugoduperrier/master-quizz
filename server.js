const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || "prof2026"; // <-- vous pouvez changer ce code ici, ou via une variable d'environnement ADMIN_CODE sur votre hébergeur

if (!process.env.DATABASE_URL) {
  console.error("ERREUR : la variable d'environnement DATABASE_URL n'est pas définie. Reliez une base de données PostgreSQL à ce service (voir README.md).");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : (process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false })
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      total_max INTEGER NOT NULL,
      questions JSONB NOT NULL,
      answers JSONB NOT NULL
    );
  `);
}

function rowToRecord(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    submittedAt: row.submitted_at.toISOString ? row.submitted_at.toISOString() : row.submitted_at,
    totalMax: row.total_max,
    questions: row.questions,
    answers: row.answers
  };
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
app.post('/api/submit', async (req, res) => {
  const { firstName, lastName, totalMax, questions, answers } = req.body || {};
  if (!firstName || !lastName || !answers || !questions) {
    return res.status(400).json({ error: "Données incomplètes." });
  }
  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO submissions (id, first_name, last_name, total_max, questions, answers)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, String(firstName).trim().slice(0, 100), String(lastName).trim().slice(0, 100), Number(totalMax) || 0, JSON.stringify(questions), JSON.stringify(answers)]
    );
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur d'enregistrement." });
  }
});

// --- Admin: list all submissions ---
app.get('/api/submissions', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM submissions ORDER BY submitted_at DESC');
    res.json(result.rows.map(rowToRecord));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur de lecture." });
  }
});

// --- Admin: update a manual grade / comment for one question ---
app.post('/api/grade', requireAdmin, async (req, res) => {
  const { id, qid, earned, comment } = req.body || {};
  try {
    const result = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Réponse introuvable." });
    const sub = rowToRecord(result.rows[0]);
    if (!sub.answers[qid]) return res.status(404).json({ error: "Question introuvable." });
    const max = sub.answers[qid].max || 0;
    sub.answers[qid].earned = Math.max(0, Math.min(Number(earned) || 0, max));
    sub.answers[qid].comment = comment || "";
    sub.answers[qid].needsManualGrade = false;
    await pool.query('UPDATE submissions SET answers = $1 WHERE id = $2', [JSON.stringify(sub.answers), id]);
    res.json({ ok: true, submission: sub });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur de mise à jour." });
  }
});

// --- Admin: delete a submission (e.g. a test run) ---
app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM submissions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur de suppression." });
  }
});

// --- Admin: CSV export ---
app.get('/api/export.csv', async (req, res) => {
  if (req.query.code !== ADMIN_CODE) return res.status(401).send("Code administrateur invalide.");
  try {
    const result = await pool.query('SELECT * FROM submissions ORDER BY submitted_at DESC');
    const submissions = result.rows.map(rowToRecord);
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
    res.send("\uFEFF" + csv);
  } catch (e) {
    console.error(e);
    res.status(500).send("Erreur d'export.");
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Master Quiz server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Impossible d'initialiser la base de données :", err.message);
    process.exit(1);
  });
