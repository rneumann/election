BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE
  IF NOT EXISTS voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    uid VARCHAR(30) UNIQUE,
    lastname VARCHAR(50) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    mtknr VARCHAR(20) UNIQUE,
    faculty VARCHAR(25),
    notes TEXT
  );

CREATE TABLE
  IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    uid VARCHAR(30) UNIQUE NOT NULL,
    lastname TEXT,
    firstname TEXT,
    mtknr TEXT,
    faculty TEXT,
    keyword TEXT,
    notes TEXT,
    approved BOOLEAN NOT NULL DEFAULT FALSE
  );

CREATE TABLE
  IF NOT EXISTS candidate_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    candidate_uid VARCHAR(30) NOT NULL REFERENCES candidates (uid) ON DELETE CASCADE ON UPDATE CASCADE UNIQUE,
    info VARCHAR(500) NOT NULL,
    picture_content_type TEXT,
    picture_data BYTEA,
    CONSTRAINT check_if_pic_values_not_null_if_exists CHECK (
      (
        picture_data IS NOT NULL
        AND picture_content_type IS NOT NULL
      )
      OR (
        picture_data IS NULL
        AND picture_content_type IS NULL
      )
    )
  );

CREATE TABLE
  IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    info TEXT NOT NULL,
    description TEXT,
    listvotes INT NOT NULL DEFAULT '0',
    seats_to_fill INT NOT NULL CHECK (seats_to_fill >= 1),
    votes_per_ballot SMALLINT NOT NULL CHECK (votes_per_ballot > 0),
    max_cumulative_votes int NOT NULL DEFAULT '0' CHECK (max_cumulative_votes >= 0),
    test_election_active BOOLEAN NOT NULL DEFAULT FALSE,
    start TIMESTAMPTZ NOT NULL,
    "end" TIMESTAMPTZ NOT NULL,
    election_type VARCHAR(50),
    counting_method VARCHAR(50),
    CONSTRAINT elections_time_range CHECK ("end" > start),
    CONSTRAINT unique_election_period UNIQUE (description, start, "end"),
    CONSTRAINT chk_election_type CHECK (
      election_type IS NULL
      OR election_type IN (
        'proportional_representation',
        'majority_vote',
        'referendum'
      )
    ),
    CONSTRAINT chk_counting_method CHECK (
      counting_method IS NULL
      OR counting_method IN (
        'sainte_lague',
        'hare_niemeyer',
        'highest_votes_absolute',
        'highest_votes_simple',
        'yes_no_referendum'
      )
    )
  );

CREATE TABLE
  IF NOT EXISTS candidate_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    identifier UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE ON UPDATE CASCADE,
    nr SMALLINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(800)
  );

CREATE TABLE
  IF NOT EXISTS electioncandidates (
    electionId UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE ON UPDATE CASCADE,
    candidateId UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE ON UPDATE CASCADE,
    listnum INT NOT NULL,
    PRIMARY KEY (electionId, candidateId),
    CONSTRAINT uq_election_listnum UNIQUE (electionId, listnum)
  );

CREATE TABLE
  IF NOT EXISTS ballots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    serial_id INT NOT NULL,
    ballot_hash TEXT NOT NULL UNIQUE,
    previous_ballot_hash TEXT,
    election UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE ON UPDATE CASCADE,
    valid BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_election_serial UNIQUE (election, serial_id)
  );

CREATE TABLE
  IF NOT EXISTS ballotvotes (
    election UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE ON UPDATE CASCADE,
    ballot UUID NOT NULL REFERENCES ballots (id) ON DELETE CASCADE ON UPDATE CASCADE,
    listnum INT NOT NULL,
    votes INT NOT NULL DEFAULT 0 CHECK (votes >= 0),
    PRIMARY KEY (election, ballot, listnum),
    CONSTRAINT fk_ballotvotes_list FOREIGN KEY (election, listnum) REFERENCES electioncandidates (electionId, listnum) ON DELETE CASCADE ON UPDATE CASCADE
  );

CREATE TABLE
  IF NOT EXISTS votingnotes (
    voterId UUID NOT NULL REFERENCES voters (id) ON DELETE CASCADE ON UPDATE CASCADE,
    electionId UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE ON UPDATE CASCADE,
    voted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (voterId, electionId)
  );

CREATE TABLE
  IF NOT EXISTS election_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    election_id UUID NOT NULL REFERENCES elections (id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    result_data JSONB NOT NULL,
    counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    counted_by TEXT,
    test_election BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_election_version UNIQUE (election_id, version)
  );

-- Partial unique index: Only one final result per election
CREATE UNIQUE INDEX IF NOT EXISTS uq_election_final ON election_results (election_id)
WHERE
  (is_final = TRUE);

CREATE INDEX IF NOT EXISTS idx_ballots_election ON ballots (election);

CREATE INDEX IF NOT EXISTS idx_ballotvotes_list ON ballotvotes (election, listnum);

CREATE INDEX IF NOT EXISTS idx_votingnotes_voter ON votingnotes (voterId, electionId);

CREATE INDEX IF NOT EXISTS idx_elections_start_end ON elections (start, "end");

CREATE
OR REPLACE VIEW counting AS
SELECT
  ec.listnum,
  c.firstname,
  c.lastname,
  c.faculty,
  SUM(bv.votes) AS votes,
  e.id AS electionid,
  e.info
FROM
  ballotvotes bv
  JOIN electioncandidates ec ON bv.listnum = ec.listnum
  AND bv.election = ec.electionId
  JOIN candidates c ON ec.candidateId = c.id
  JOIN elections e ON ec.electionId = e.id
GROUP BY
  e.id,
  ec.listnum,
  c.firstname,
  c.lastname,
  c.faculty,
  e.info;

CREATE
OR REPLACE VIEW ballot_statistics AS
SELECT
  b.election,
  COUNT(b.id) AS total_ballots,
  COUNT(b.id) FILTER (
    WHERE
      b.valid = TRUE
  ) AS valid_ballots,
  COUNT(b.id) FILTER (
    WHERE
      b.valid = FALSE
  ) AS invalid_ballots
FROM
  ballots b
GROUP BY
  b.election;

COMMIT;