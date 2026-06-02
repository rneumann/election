import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';
export const integrityService = {
  /**
   * Prüft die gesamte Kette der Audit Logs auf Konsistenz
   * Der prev_hash jedes Eintrags muss der entry_hash des vorherigen sein
   * @returns {Promise<{success: boolean, totalChecked: number, errors: string[], timestamp: string}>}
   */
  verifyAuditLogChain: async () => {
    const db = await client.connect();
    try {
      logger.info('Starte Prüfung der Audit Log Chain...');

      // Alle Logs aufsteigend nach ID laden
      const { rows } = await db.query(
        `SELECT 
          id, 
          prev_hash, 
          entry_hash, 
          action_type, 
          timestamp 
        FROM audit_log 
        ORDER BY id ASC`,
      );

      if (rows.length <= 1) {
        return {
          success: true,
          totalChecked: rows.length,
          errors: [],
          message: 'Zu wenige Einträge für eine Kettenprüfung.',
          timestamp: new Date().toISOString(),
        };
      }

      let errors = [];

      // Überprüfe die gesamte Kette
      for (let i = 1; i < rows.length; i++) {
        // Array-Zugriff mit Index ist hier sicher, da i innerhalb der Arraygrenzen liegt
        // eslint-disable-next-line security/detect-object-injection
        const current = rows[i];
        const previous = rows[i - 1];

        // Der prev_hash des aktuellen Eintrags MUSS der entry_hash des vorherigen sein
        if (current.prev_hash !== previous.entry_hash) {
          errors.push({
            position: i,
            currentId: current.id,
            currentAction: current.action_type,
            currentTimestamp: current.timestamp,
            expectedHash: previous.entry_hash,
            foundHash: current.prev_hash,
            message: `Kettenubruch bei ID ${current.id}: Hashes stimmen nicht überein`,
          });
        }
      }

      const result = {
        success: errors.length === 0,
        totalChecked: rows.length,
        errors: errors,
        timestamp: new Date().toISOString(),
        message:
          errors.length === 0
            ? `✓ Audit Log Chain vollständig intakt (${rows.length} Einträge geprüft)`
            : `✗ ${errors.length} Fehler in der Audit Log Chain gefunden`,
      };

      logger.info(result.message);
      return result;
    } catch (err) {
      logger.error('Fehler bei Audit Log Chain Prüfung:', err);
      return {
        success: false,
        totalChecked: 0,
        errors: [{ message: err.message }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      db.release();
    }
  },

};
