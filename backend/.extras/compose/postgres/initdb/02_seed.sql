\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
SET TIME ZONE 'Europe/Berlin';

\echo 'elections'
\copy elections (id,info,description,votes_per_ballot,start,"end") FROM '/docker-entrypoint-initdb.d/data/csv/elections.csv' CSV HEADER;

\echo 'candidates'
\copy candidates (id,lastname,firstname,mtknr,faculty,keyword,notes,votergroup,approved) FROM '/docker-entrypoint-initdb.d/data/csv/candidates.csv' CSV HEADER;

\echo 'voters'
\copy voters (id,uid,lastname,firstname,mtknr,faculty,votergroup,notes) FROM '/docker-entrypoint-initdb.d/data/csv/voters.csv' CSV HEADER;

\echo 'electioncandidates'
\copy electioncandidates (electionId,candidateId,listnum) FROM '/docker-entrypoint-initdb.d/data/csv/electioncandidates.csv' CSV HEADER;

\echo 'ballots'
\copy ballots (id,election,valid) FROM '/docker-entrypoint-initdb.d/data/csv/ballots.csv' CSV HEADER;

\echo 'ballotvotes'
\copy ballotvotes (election,ballot,listnum,votes) FROM '/docker-entrypoint-initdb.d/data/csv/ballotvotes.csv' CSV HEADER;

\echo 'votergroups'
\copy votergroups (electionId,votergroup,faculty) FROM '/docker-entrypoint-initdb.d/data/csv/votergroups.csv' CSV HEADER;

\echo 'votingnotes'
\copy votingnotes (voterId,electionId,notes) FROM '/docker-entrypoint-initdb.d/data/csv/votingnotes.csv' CSV HEADER;

\echo 'Seed DONE.'
