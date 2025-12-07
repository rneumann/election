import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { getAllCommitteeElections, getCandidatesForElection } from '../service/committee.service.js';
import { logger } from '../conf/logger/logger.js';
import { writeAuditLog } from '../audit/auditLogger.js';

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