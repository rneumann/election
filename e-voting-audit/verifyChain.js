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

const publicKey = fs.readFileSync(path.join(__dirname, 'keys', 'public.pem'), 'utf8');

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Gleiche Hilfsfunktion wie im Logger!
function deterministicStringify(obj) {
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

async function verifyLog() {
    console.log("🔍 Starte Integritätsprüfung des Audit-Logs...");
    const client = await pool.connect();
    
    try {
        const res = await client.query("SELECT * FROM audit_log ORDER BY id ASC");
        const rows = res.rows;

        if (rows.length === 0) {
            console.log("⚠️  Keine Logs vorhanden.");
            return;
        }

        let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
        let errors = 0;

        for (const row of rows) {
            console.log(`Prüfe ID ${row.id}...`);

            if (row.prev_hash !== previousHash) {
                console.error(`❌ KETTEN-BRUCH bei ID ${row.id}!`);
                errors++;
            }

            // Daten exakt so nachbauen wie im Logger
            const payloadObject = {
                timestamp: row.timestamp.toISOString(),
                actor_id_hash: row.actor_id_hash,
                actor_role: row.actor_role,
                action_type: row.action_type,
                level: row.level,
                details: row.details, // Postgres liefert hier ein Objekt
                prev_hash: row.prev_hash
            };

            // HIER SORTIEREN WIR JETZT AUCH:
            const payloadToHash = deterministicStringify(payloadObject);
            const calculatedHash = sha256(payloadToHash);

            if (calculatedHash !== row.entry_hash) {
                console.error(`❌ INHALTS-MANIPULATION bei ID ${row.id}!`);
                console.error(`   DB Hash:   ${row.entry_hash}`);
                console.error(`   Berechnet: ${calculatedHash}`);
                
                // Debugging Hilfe: Was war unterschiedlich?
                // console.log("Payload String:", payloadToHash); 
                
                errors++;
            }

            const verify = crypto.createVerify('SHA256');
            verify.update(row.entry_hash);
            const isSignatureValid = verify.verify(publicKey, row.signature, 'hex');

            if (!isSignatureValid) {
                console.error(`❌ SIGNATUR UNGÜLTIG bei ID ${row.id}!`);
                errors++;
            }

            previousHash = row.entry_hash;
        }

        if (errors === 0) {
            console.log("\n✅ PRÜFUNG ERFOLGREICH: Die Blockchain ist intakt.");
        } else {
            console.log(`\n⛔ PRÜFUNG FEHLGESCHLAGEN: ${errors} Fehler gefunden!`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

verifyLog();