BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS voters (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid       TEXT UNIQUE,
  lastname  TEXT NOT NULL,
  firstname TEXT NOT NULL,
  mtknr     TEXT UNIQUE,
  faculty   TEXT,
  notes     TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lastname  TEXT NOT NULL,
  firstname TEXT NOT NULL,
  mtknr     TEXT,
  faculty   TEXT,
  keyword   TEXT,
  notes     TEXT
);

CREATE TABLE IF NOT EXISTS elections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  info             TEXT NOT NULL,
  description      TEXT,
  votes_per_ballot SMALLINT NOT NULL CHECK (votes_per_ballot > 0),
  start            TIMESTAMPTZ NOT NULL,
  "end"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT elections_time_range CHECK ("end" > start)
);

CREATE TABLE IF NOT EXISTS electioncandidates (
  electionId  UUID NOT NULL REFERENCES elections(id)  ON DELETE CASCADE ON UPDATE CASCADE,
  candidateId UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE ON UPDATE CASCADE,
  listnum     INT  NOT NULL,
  PRIMARY KEY (electionId, candidateId),
  CONSTRAINT uq_election_listnum UNIQUE (electionId, listnum)
);

CREATE TABLE IF NOT EXISTS votergroups (
  electionId UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  votergroup TEXT NOT NULL,
  faculty    TEXT,
  PRIMARY KEY (electionId, votergroup)
);

CREATE TABLE IF NOT EXISTS ballots (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  valid     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ballotvotes (
  election UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ballot   UUID NOT NULL REFERENCES ballots(id)   ON DELETE CASCADE ON UPDATE CASCADE,
  listnum  INT  NOT NULL,
  votes    INT  NOT NULL DEFAULT 0 CHECK (votes >= 0),
  PRIMARY KEY (election, ballot, listnum),
  CONSTRAINT fk_ballotvotes_list
    FOREIGN KEY (election, listnum)
    REFERENCES electioncandidates (electionId, listnum)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS votingnotes (
  voterId    UUID NOT NULL REFERENCES voters(id)    ON DELETE CASCADE ON UPDATE CASCADE,
  electionId UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  notes      TEXT,
  PRIMARY KEY (voterId, electionId)
);

CREATE INDEX IF NOT EXISTS idx_ballots_election   ON ballots(election);
CREATE INDEX IF NOT EXISTS idx_ballotvotes_list   ON ballotvotes(election, listnum);
CREATE INDEX IF NOT EXISTS idx_votingnotes_voter  ON votingnotes(voterId, electionId);

CREATE OR REPLACE VIEW ballotlist AS
SELECT 
  ec.listnum,
  c.id   AS cid,
  c.firstname,
  c.lastname,
  c.faculty,
  e.id   AS electionid,
  e.info
FROM electioncandidates ec
JOIN candidates c ON ec.candidateId = c.id
JOIN elections  e ON ec.electionId  = e.id
ORDER BY e.id, ec.listnum;

CREATE OR REPLACE VIEW counting AS
SELECT
  ec.listnum,
  c.firstname,
  c.lastname,
  c.faculty,
  SUM(bv.votes) AS votes,
  e.id  AS electionid,
  e.info
FROM ballotvotes bv
JOIN electioncandidates ec ON bv.listnum = ec.listnum AND bv.election = ec.electionId
JOIN candidates c          ON ec.candidateId = c.id
JOIN elections  e          ON ec.electionId  = e.id
GROUP BY e.id, ec.listnum, c.firstname, c.lastname, c.faculty, e.info;

CREATE OR REPLACE VIEW votingcounts AS
SELECT 
  election,
  listnum,
  SUM(votes) AS votes
FROM ballotvotes
GROUP BY election, listnum;

CREATE OR REPLACE VIEW numcandidatesperelection AS
SELECT 
  electionid,
  COUNT(candidateid) AS candidates
FROM electioncandidates
GROUP BY electionid;

CREATE OR REPLACE VIEW numvotersperelection AS
SELECT 
  electionid,
  COUNT(DISTINCT voterid) AS voters
FROM votingnotes
GROUP BY electionid;

CREATE OR REPLACE VIEW electionoverview AS
SELECT 
  e.id,
  e.info,
  e.description,
  e.votes_per_ballot AS votes_per_ballot,
  e.start,
  e."end",
  COALESCE(nc.candidates, 0) AS candidates,
  COALESCE(nv.voters, 0)     AS voters,
  COUNT(DISTINCT b.id)       AS ballots
FROM elections e
LEFT JOIN numcandidatesperelection nc ON nc.electionid = e.id
LEFT JOIN numvotersperelection   nv ON nv.electionid = e.id
LEFT JOIN ballots b ON b.election = e.id
GROUP BY e.id, e.info, e.description, e.votes_per_ballot, e.start, e."end", nc.candidates, nv.voters;

CREATE OR REPLACE VIEW electionspervoter AS
SELECT
  v.id AS uid,
  v.lastname,
  v.firstname,
  v.mtknr,
  v.faculty,
  e.id   AS eid,
  e.info,
  e.description AS descr,
  (vn.notes IS NOT NULL) AS voted
FROM voters v
CROSS JOIN elections e
LEFT JOIN votingnotes vn ON vn.voterid = v.id AND vn.electionid = e.id;

CREATE OR REPLACE VIEW voterregistry AS
SELECT 
  faculty,
  lastname,
  firstname,
  mtknr
FROM voters;

COMMIT;