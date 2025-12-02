// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Erlaubt dem Frontend (Port 5173) den Zugriff
app.use(express.json());

// DB Verbindung
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// API Route: Audit Logs abrufen
app.get('/api/logs', async (req, res) => {
  try {
    // Wir holen die Logs sortiert nach ID (neueste zuerst wäre 'DESC', wir nehmen hier 'ASC')
    const result = await pool.query('SELECT * FROM audit_log ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Serverfehler beim Abrufen der Logs" });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`📡 API Server läuft auf http://localhost:${PORT}`);
});