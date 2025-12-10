import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { getAllCommitteeElections, getCandidatesForElection } from '../service/committee.service.js';
import { logger } from '../conf/logger/logger.js';
import { writeAuditLog } from '../audit/auditLogger.js';
import { getAllCandidatesWithElections, updateCandidateStatus } from '../service/committee.service.js';

export const committeeRouter = express.Router();

// Middleware: Nur eingeloggte "committee" User (oder Admin) dürfen hier rein
const protect = [ensureAuthenticated, ensureHasRole(['committee', 'admin'])];

/**
 * GET /api/committee/elections
 * Lädt die Liste der Wahlen.
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
 * GET /api/committee/elections/:id/candidates
 * Lädt Kandidaten für eine Wahl und loggt den Zugriff.
 */
committeeRouter.get('/elections/:id/candidates', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const candidates = await getCandidatesForElection(id);

    // AUDIT: Protokollieren, dass Kandidatendaten eingesehen wurden
    writeAuditLog({
        actionType: 'COMMITTEE_VIEW_CANDIDATES',
        level: 'INFO',
        actorId: req.user.username,
        actorRole: req.user.role,
        details: { electionId: id, candidate_count: candidates.length }
    }).catch(e => logger.error(e));

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



/**
 * GET /api/committee/candidates
 * Übersicht aller Kandidaten und ihrer Bewerbungen
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
 * PATCH /api/committee/candidates/:cid/elections/:eid/status
 * Kandidat für eine Wahl akzeptieren/ablehnen
 */
committeeRouter.patch('/candidates/:cid/elections/:eid/status', protect, async (req, res) => {
  const { cid, eid } = req.params;
  const { status } = req.body; // 'ACCEPTED' oder 'REJECTED'

  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
    return res.status(400).json({ message: 'Ungültiger Status' });
  }

  try {
    await updateCandidateStatus(cid, eid, status);

    // WICHTIG: Entscheidung revisionssicher loggen!
    writeAuditLog({
      actionType: 'COMMITTEE_DECISION',
      level: 'WARN', // Warn, weil es den Wahlausgang beeinflusst
      actorId: req.user.username,
      actorRole: req.user.role,
      details: { 
        candidateId: cid, 
        electionId: eid, 
        new_status: status 
      }
    }).catch(e => logger.error(e));

    res.json({ message: 'Status aktualisiert', status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});