import express from 'express';
import { ensureAuthenticated } from '../auth/auth.js';
import {
  getAllCommitteeElections,
  getCandidatesForElection,
  getAllCandidatesWithElections,
  updateCandidateStatus,
} from '../service/committee.service.js';
import { logger } from '../conf/logger/logger.js';
import { writeAuditLog } from '../audit/auditLogger.js';

export const committeeRouter = express.Router();

/**
 * Eigene Middleware für Rechte-Check.
 * Erlaubt Zugriff, wenn Rolle = 'admin' ODER 'committee'.
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {function} next - Express Next Funktion
 * @returns {object|void} Response oder Next
 */
const requireCommitteeRights = (req, res, next) => {
  // 1. Prüfen, ob User überhaupt existiert (durch ensureAuthenticated sichergestellt)
  if (!req.user) {
    return res.status(401).json({ message: 'Nicht authentifiziert' });
  }

  // 2. Prüfen auf Rolle (Admin ODER Committee)
  if (req.user.role === 'admin' || req.user.role === 'committee') {
    return next(); // Alles ok, weiter gehts
  }

  // 3. Sonst: Fehler
  logger.warn(`Forbidden access attempt by user ${req.user.username} (Role: ${req.user.role})`);
  return res.status(403).json({ message: 'Zugriff verweigert: Nur für Wahlausschuss oder Admins.' });
};

// Kombinierte Protection: Erst Login prüfen, dann Rolle prüfen
const protect = [ensureAuthenticated, requireCommitteeRights];

// --- ROUTES ---

/**
 * GET /api/committee/elections
 * Lädt die Liste der Wahlen.
 * @param {object} req - Express Request
 * @param {object} res - Express Response
 */
committeeRouter.get('/elections', protect, async (req, res) => {
  try {
    const elections = await getAllCommitteeElections();
    res.json(elections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/committee/candidates
 * Übersicht aller Kandidaten und ihrer Bewerbungen.
 * @param {object} req - Express Request
 * @param {object} res - Express Response
 */
committeeRouter.get('/candidates', protect, async (req, res) => {
  try {
    const candidates = await getAllCandidatesWithElections();
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/committee/elections/:id/candidates
 * Lädt Kandidaten für eine Wahl und loggt den Zugriff.
 * @param {object} req - Express Request
 * @param {object} res - Express Response
 */
committeeRouter.get('/elections/:id/candidates', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const candidates = await getCandidatesForElection(id);

    // AUDIT: Protokollieren
    writeAuditLog({
      actionType: 'COMMITTEE_VIEW_CANDIDATES',
      level: 'INFO',
      actorId: req.user.username,
      actorRole: req.user.role,
      details: { electionId: id, candidate_count: candidates.length },
    }).catch((e) => logger.error(e));

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/committee/candidates/:cid/elections/:eid/status
 * Kandidat für eine Wahl akzeptieren/ablehnen.
 * @param {object} req - Express Request
 * @param {object} res - Express Response
 * @returns {object} JSON Response
 */
committeeRouter.patch('/candidates/:cid/elections/:eid/status', protect, async (req, res) => {
  const { cid, eid } = req.params;
  const { status } = req.body;

  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
    return res.status(400).json({ message: 'Ungültiger Status' });
  }

  try {
    await updateCandidateStatus(cid, eid, status);

    // AUDIT: Entscheidung revisionssicher loggen!
    writeAuditLog({
      actionType: 'COMMITTEE_DECISION',
      level: 'WARN',
      actorId: req.user.username,
      actorRole: req.user.role,
      details: {
        candidateId: cid,
        electionId: eid,
        new_status: status,
      },
    }).catch((e) => logger.error(e));

    res.json({ message: 'Status aktualisiert', status });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
});