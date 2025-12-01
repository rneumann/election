require('dotenv').config();
const { Pool } = require('pg');
const { writeAuditLog } = require('./auditLogger');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- SETUP ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const publicKey = fs.readFileSync(path.join(__dirname, 'keys', 'public.pem'), 'utf8');
const SALT = process.env.AUDIT_SALT;

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function deterministicStringify(obj) {
    if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
    if (Array.isArray(obj)) return JSON.stringify(obj.map(item => JSON.parse(deterministicStringify(item))));
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    sortedKeys.forEach(key => result[key] = JSON.parse(deterministicStringify(obj[key])));
    return JSON.stringify(result);
}

// Validator
async function runValidator() {
    const client = await pool.connect();
    try {
        const rows = (await client.query("SELECT * FROM audit_log ORDER BY id ASC")).rows;
        if (rows.length === 0) return { valid: true, msg: "Empty DB" };

        let prevHash = rows[0].prev_hash; // Starten mit dem Hash, der im ersten Element steht
        // Optional: Prüfen ob der allererste prev_hash der Genesis-Hash ist, falls nötig.
        // Für diesen Test reicht Konsistenz.
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // 1. Ketten-Prüfung (nur wenn nicht der allererste Eintrag, oder Logik anpassen)
            // Wir prüfen: Zeigt dieser Eintrag auf den Hash, den wir erwarten?
            if (i > 0 && row.prev_hash !== rows[i-1].entry_hash) {
                 return { valid: false, code: "CHAIN_BROKEN", id: row.id };
            }

            // 2. Inhalts-Prüfung
            const payload = {
                timestamp: row.timestamp.toISOString(),
                actor_id_hash: row.actor_id_hash,
                actor_role: row.actor_role,
                action_type: row.action_type,
                level: row.level,
                details: row.details,
                prev_hash: row.prev_hash
            };
            const calcHash = sha256(deterministicStringify(payload));
            if (calcHash !== row.entry_hash) return { valid: false, code: "HASH_MISMATCH", id: row.id };

            // 3. Signatur-Prüfung
            const verify = crypto.createVerify('SHA256');
            verify.update(row.entry_hash);
            if (!verify.verify(publicKey, row.signature, 'hex')) return { valid: false, code: "BAD_SIGNATURE", id: row.id };
        }
        return { valid: true };
    } finally {
        client.release();
    }
}

async function runAdvancedTests() {
    console.log("🚀 STARTING ADVANCED SECURITY AUDIT SUITE (Robuste Version)\n");
    const client = await pool.connect();

    try {
        // --- 1. CLEAN START ---
        // WICHTIG: Nur TRUNCATE ohne RESTART IDENTITY -> Umgeht Berechtigungsprobleme
        await client.query("TRUNCATE TABLE audit_log");
        console.log("✅ T1.1: DB geleert (IDs laufen weiter).");

        // --- 2. RACE CONDITIONS ---
        console.log("🔄 T6.1: Teste Concurrent Writes...");
        await Promise.all([
            writeAuditLog({ actionType: "RACE_1", level: "INFO", details: { t: 1 }, actorId: "UserA" }),
            writeAuditLog({ actionType: "RACE_2", level: "INFO", details: { t: 2 }, actorId: "UserB" }),
            writeAuditLog({ actionType: "RACE_3", level: "INFO", details: { t: 3 }, actorId: "UserC" })
        ]);
        
        const resRace = await runValidator();
        if(resRace.valid) console.log("✅ T6.1: Concurrent Writes erfolgreich.");
        else throw new Error(`❌ T6.1 Fehlgeschlagen: ${resRace.code}`);

        // --- 3. DSGVO CHECK ---
        console.log("🕵️ T9.1: Prüfe PII Hashing...");
        const rowUserA = (await client.query("SELECT actor_id_hash FROM audit_log WHERE details->>'t' = '1'")).rows[0];
        // Falls wir IDs brauchen, holen wir sie uns jetzt dynamisch:
        const targetId = (await client.query("SELECT id FROM audit_log WHERE details->>'t' = '2'")).rows[0].id;

        const expectedHash = sha256("UserA" + SALT);
        if(rowUserA.actor_id_hash === expectedHash) console.log("✅ T9.1: PII korrekt gehasht.");
        else throw new Error("❌ T9.1: PII Fehler!");

        // --- 4. MANIPULATION (INHALT) ---
        console.log(`🔨 T3.1: Hacke Eintrag ID ${targetId} (Details ändern)...`);
        await client.query(`UPDATE audit_log SET details = '{"hacked": true}' WHERE id = $1`, [targetId]);
        
        const resHack1 = await runValidator();
        if(!resHack1.valid && resHack1.code === "HASH_MISMATCH") console.log("✅ T3.1: Manipulation erkannt.");
        else throw new Error(`❌ T3.1: Nicht erkannt! Status: ${JSON.stringify(resHack1)}`);

        // --- 5. REKONSTRUKTION (SMART HACKER) ---
        console.log("🥷 T5.1: Simuliere 'Smart Hacker'...");
        
        // Reset
        await client.query("TRUNCATE TABLE audit_log");
        // Neuen Eintrag erzeugen, um eine ID zu bekommen
        const newLogId = await writeAuditLog({ actionType: "INIT_HACK", level: "INFO", details: {} });
        
        // Echte Daten holen
        const cleanRow = (await client.query("SELECT * FROM audit_log WHERE id = $1", [newLogId])).rows[0];
        
        // Fälschung bauen
        const hackedDetails = { msg: "I own this" };
        const hackedPayload = {
            timestamp: cleanRow.timestamp.toISOString(),
            actor_id_hash: cleanRow.actor_id_hash,
            actor_role: cleanRow.actor_role,
            action_type: cleanRow.action_type,
            level: cleanRow.level,
            details: hackedDetails,
            prev_hash: cleanRow.prev_hash
        };
        const forgedHash = sha256(deterministicStringify(hackedPayload));

        // Hack ausführen (Update auf die dynamische ID)
        await client.query(
            "UPDATE audit_log SET details = $1, entry_hash = $2 WHERE id = $3",
            [JSON.stringify(hackedDetails), forgedHash, newLogId]
        );

        const resSmartHack = await runValidator();
        if(!resSmartHack.valid && resSmartHack.code === "BAD_SIGNATURE") console.log("✅ T5.1: 'Smart Hack' (falsche Signatur) erkannt.");
        else throw new Error(`❌ T5.1: Nicht erkannt! Validator sagte: ${JSON.stringify(resSmartHack)}`);

        console.log("\n---------------------------------------------------");
        console.log("🏆 SECURITY AUDIT PASSED: System ist sicher.");
        console.log("---------------------------------------------------");

    } catch (err) {
        console.error("\n💀 TEST FAILURE:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

runAdvancedTests();