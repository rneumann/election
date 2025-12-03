import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { client } from '../database/db.js';

// Pfad-Logik: Priorität auf Environment Variable, sonst relativer Pfad
const keyPathEnv = process.env.PRIVATE_KEY_PATH;
// Wir versuchen den Pfad relativ zum Projektroot aufzulösen, falls er lokal ist
const localKeyPath = path.resolve(
  process.cwd(),
  '.extras/compose/backend/secrets/keys/private.pem',
);

let privateKey;
const keyPathToUse = keyPathEnv && fs.existsSync(keyPathEnv) ? keyPathEnv : localKeyPath;

try {
  if (fs.existsSync(keyPathToUse)) {
    privateKey = fs.readFileSync(keyPathToUse, 'utf8');
  } else {
    console.warn(`⚠️ AUDIT LOG: Private Key nicht gefunden unter: ${keyPathToUse}`);
  }
} catch (e) {
  console.warn('⚠️ AUDIT LOG: Fehler beim Laden des Keys.', e.message);
}

const SALT = process.env.AUDIT_SALT || 'default_salt';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function signData(data) {
  if (!privateKey) return 'NO_KEY';
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

function deterministicStringify(obj) {
  if (typeof obj === 'undefined') return 'null';
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj))
    return JSON.stringify(obj.map((item) => JSON.parse(deterministicStringify(item))));
  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  sortedKeys.forEach((key) => {
    result[key] = JSON.parse(deterministicStringify(obj[key]));
  });
  return JSON.stringify(result);
}

export async function writeAuditLog(event) {
  try {
    // Wir nutzen den globalen Client.
    // Für maximale Sicherheit bei Race-Conditions nutzen wir LOCK TABLE.
    await client.query('BEGIN');
    await client.query('LOCK TABLE audit_log IN EXCLUSIVE MODE');

    const prevResult = await client.query(
      'SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1',
    );
    const prevHash =
      prevResult.rows[0]?.entry_hash ||
      '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date().toISOString();
    const actorIdHash = event.actorId ? sha256(event.actorId + SALT) : null;
    const ipHash = event.ip ? sha256(event.ip + SALT) : null;
    const sessionHash = event.sessionId ? sha256(event.sessionId) : null;

    const payloadObject = {
      timestamp,
      actor_id_hash: actorIdHash,
      actor_role: event.actorRole || null,
      action_type: event.actionType || 'UNKNOWN',
      level: event.level || 'INFO',
      details: event.details || {},
      prev_hash: prevHash,
    };

    const payloadToHash = deterministicStringify(payloadObject);
    const entryHash = sha256(payloadToHash);
    const signature = signData(entryHash);

    const query = `
      INSERT INTO audit_log 
      (timestamp, actor_id_hash, actor_role, ip_hash, session_hash, action_type, level, details, prev_hash, entry_hash, signature)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      signature,
    ];

    await client.query(query, values);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CRITICAL: Audit Log failed:', err.message);
  }
}
