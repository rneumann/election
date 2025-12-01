require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const privateKey = fs.readFileSync(path.resolve(process.env.PRIVATE_KEY_PATH), 'utf8');
const SALT = process.env.AUDIT_SALT;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function signData(data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

function deterministicStringify(obj) {
    if (typeof obj === 'undefined') return 'null';
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return JSON.stringify(obj.map(item => JSON.parse(deterministicStringify(item))));
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    sortedKeys.forEach(key => {
        result[key] = JSON.parse(deterministicStringify(obj[key]));
    });
    return JSON.stringify(result);
}

async function writeAuditLog(event) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // --- DER FIX FÜR RACE CONDITIONS ---
    // 'EXCLUSIVE MODE' erlaubt anderen das Lesen (SELECT), aber verhindert, 
    // dass jemand anders gleichzeitig schreibt oder die Struktur ändert.
    // Das zwingt alle parallelen Schreibvorgänge in eine strikte Warteschlange.
    await client.query('LOCK TABLE audit_log IN EXCLUSIVE MODE'); 

    // 1. Letzten Hash abrufen
    // Jetzt ist es sicher, auch wenn die Tabelle leer ist.
    const prevResult = await client.query(
      "SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1"
    );
    const prevHash = prevResult.rows[0]?.entry_hash || '0000000000000000000000000000000000000000000000000000000000000000';

    // 2. Daten vorbereiten
    const timestamp = new Date().toISOString();
    
    const actorIdHash = event.actorId ? sha256(event.actorId + SALT) : null;
    const ipHash = event.ip ? sha256(event.ip + SALT) : null;
    const sessionHash = event.sessionId ? sha256(event.sessionId) : null;

    // 3. Payload bauen
    const payloadObject = {
      timestamp,
      actor_id_hash: actorIdHash,
      actor_role: event.actorRole || null,
      action_type: event.actionType || 'UNKNOWN',
      level: event.level || 'INFO',
      details: event.details || {},
      prev_hash: prevHash
    };

    const payloadToHash = deterministicStringify(payloadObject);
    const entryHash = sha256(payloadToHash);
    const signature = signData(entryHash);

    // 4. In DB schreiben
    const query = `
      INSERT INTO audit_log 
      (timestamp, actor_id_hash, actor_role, ip_hash, session_hash, action_type, level, details, prev_hash, entry_hash, signature)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const values = [
      timestamp,
      actorIdHash,
      event.actorRole || null,
      ipHash,
      sessionHash,
      event.actionType,
      event.level,
      event.details, 
      prevHash,
      entryHash,
      signature
    ];

    const res = await client.query(query, values);
    await client.query('COMMIT');
    
    return res.rows[0].id;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Schreiben des Audit Logs:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { writeAuditLog };