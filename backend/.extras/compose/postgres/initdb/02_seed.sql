SET client_encoding = 'UTF8';
SET TIME ZONE 'Europe/Berlin';

\echo 'elections'
\copy elections (id, info, description, listvotes, votes_per_ballot, max_cumulative_votes, test_election_active, start, "end") FROM '/docker-entrypoint-initdb.d/data/csv/elections.csv' CSV HEADER;

\echo 'candidates'
\copy candidates (id, lastname, firstname, mtknr, faculty, keyword, notes, approved) FROM '/docker-entrypoint-initdb.d/data/csv/candidates.csv' CSV HEADER;

\echo 'voters'
\copy voters (id, uid, lastname, firstname, mtknr, faculty, notes) FROM '/docker-entrypoint-initdb.d/data/csv/voters.csv' CSV HEADER;

\echo 'electioncandidates'
\copy electioncandidates (electionId, candidateId, listnum) FROM '/docker-entrypoint-initdb.d/data/csv/electioncandidates.csv' CSV HEADER;

\echo 'ballots'
\copy ballots (id, ballot_hash, previous_ballot_hash, election, valid) FROM '/docker-entrypoint-initdb.d/data/csv/ballots.csv' CSV HEADER;

\echo 'ballotvotes'
\copy ballotvotes (election, ballot, listnum, votes) FROM '/docker-entrypoint-initdb.d/data/csv/ballotvotes.csv' CSV HEADER;

\echo 'votingnotes'
\copy votingnotes (voterId, electionId, voted) FROM '/docker-entrypoint-initdb.d/data/csv/votingnotes.csv' CSV HEADER;

\echo 'Seed DONE.'
