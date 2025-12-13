process.env.BALLOT_SECRET = 'test_secret';

import { describe, test, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const queryMock = vi.fn();
vi.mock('../src/database/db.js', () => ({
  client: {
    query: (...args) => queryMock(...args),
  },
}));

vi.mock('../src/security/secret-reader.js', () => ({
  readSecret: vi.fn().mockResolvedValue('test_secret'), // dein gewünschter Wert
}));

import {
  getElections,
  getElectionById,
  getVoterById,
  createBallot,
} from '../src/service/voter.service.js';
import { generateBallotHashes } from '../src/security/generate-ballot-hashes.js'; // mock muss vorher stehen

import { logger } from '../src/conf/logger/logger.js';
import { client } from '../src/database/db.js';
import { generateBallotHashes } from '../src/security/generate-ballot-hashes.js';
import crypto from 'crypto';
import { readSecret } from '../src/security/secret-reader.js';

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.mockReset();
});

function setupQueryMock(mapping) {
  queryMock.mockImplementation(async (sql, params) => {
    const sqlStr = (sql || '').toString().trim();
    for (const m of mapping) {
      if (m.predicate(sqlStr, params)) {
        if (m.throw) throw m.throw;
        return m.result;
      }
    }
    return { rows: [] };
  });
}

describe('Data service - getElections', () => {
  test('returns all elections when no filters provided', async () => {
    const rows = [{ id: '1234', title: 'E1' }];
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows },
      },
    ]);

    const res = await getElections(undefined, 'u001');
    expect(res).toEqual(rows);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('FROM elections');
    expect(logger.debug).toHaveBeenCalled();
  });

  test('returns elections for voter', async () => {
    const rows = [{ id: '2', title: 'E2' }];

    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows },
      },
    ]);

    const res = await getElections('active', 'u001');
    expect(res).toEqual(rows);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('vn.voterId = $1');
    expect(params).toEqual(['u001']);
  });

  test('returns empty array when no elections found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows: [] },
      },
    ]);

    const res = await getElections();
    expect(res).toEqual([]);
  });

  test('handles DB errors gracefully', async () => {
    setupQueryMock([
      {
        predicate: () => true,
        throw: new Error('DB fail'),
      },
    ]);

    await expect(getElections(undefined, 'u001')).rejects.toThrowError('Database query failed');
  });
});

describe('Data service - getElectionById', () => {
  test('returns election when found', async () => {
    const row = { id: 'e1', info: 'info' };
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows: [row] },
      },
    ]);

    const res = await getElectionById('e1');
    expect(res).toEqual(row);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM elections'), ['e1']);
  });

  test('returns empty array when not found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows: [] },
      },
    ]);

    const res = await getElectionById('missing');
    expect(res).toEqual(undefined);
  });

  test('handles DB error and logs stack', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        throw: new Error('boom'),
      },
    ]);

    await expect(getElectionById('e1')).rejects.toThrowError('Database query failed');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('Data service - getVoterById', () => {
  test('returns voter when found', async () => {
    const voter = { uid: 42, name: 'Alice' };
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [voter] },
      },
    ]);

    const res = await getVoterById(42);
    expect(res).toEqual(voter);
    expect(logger.debug).toHaveBeenCalled();
  });

  test('returns undefined when not found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [] },
      },
    ]);

    const res = await getVoterById(123);
    expect(res).toEqual(undefined);
  });

  test('handles DB error and throws error', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        throw: new Error('db error'),
      },
    ]);

    await expect(getVoterById(123)).rejects.toThrowError('Database query failed');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('Data service - createBallot', () => {
  test('creates ballot, votes and updates votingnote, commits transaction', async () => {
    const ballot = {
      electionId: 'E1',
      valid: true,
      voteDecision: [
        { listnum: 1, votes: 2 },
        { listnum: 2, votes: 1 },
      ],
    };

    const voter = { id: 'voter-id', uid: 'u001', name: 'Bob' };

    // Setup query mocks
    setupQueryMock([
      // BEGIN
      {
        predicate: (sql) => sql === 'BEGIN',
        result: { rows: [] },
      },
      // get previous ballot hash
      {
        predicate: (sql) => sql.includes('FROM ballots') && sql.includes('ORDER BY created DESC'),
        result: { rows: [{ ballot_hash: 'prev-hash-123' }] },
      },
      // INSERT INTO ballots
      {
        predicate: (sql) => sql.includes('INSERT INTO ballots'),
        result: { rows: [{ id: 'ballot-1' }] },
      },
      // INSERT INTO ballotvotes (2 candidates)
      {
        predicate: (sql) => sql.includes('INSERT INTO ballotvotes'),
        result: { rows: [{ id: 'bv' }] },
      },
      // UPDATE votingnotes
      {
        predicate: (sql) => sql.includes('UPDATE votingnotes'),
        result: { rows: [{ id: 'vn' }] },
      },
      // COMMIT
      {
        predicate: (sql) => sql === 'COMMIT',
        result: { rows: [] },
      },
    ]);

    const res = await createBallot(ballot, voter);

    expect(res).toEqual({ id: 'ballot-1' });

    // Logger wurde aufgerufen
    expect(logger.debug).toHaveBeenCalled();

    // SQL-Abfolgen prüfen
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls).toContain('BEGIN');
    expect(calledSqls.some((s) => s.includes('INSERT INTO ballots'))).toBeTruthy();
    expect(calledSqls.filter((s) => s.includes('INSERT INTO ballotvotes')).length).toBe(2);
    expect(calledSqls.some((s) => s.includes('UPDATE votingnotes'))).toBeTruthy();
    expect(calledSqls).toContain('COMMIT');
  });

  test('returns 404 if voter cant be found', async () => {
    const ballot = {
      electionId: 'E1',
      valid: true,
      voteDecision: [],
    };

    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { ok: false, data: undefined },
      },
    ]);

    const res = await createBallot(ballot, 'falseID123');
    expect(res).toBe(undefined);
  });

  test('rolls back when ballotvotes insert fails and returns undefined', async () => {
    const ballot = {
      electionId: 'E1',
      valid: true,
      voteDecision: [{ listnum: 1, votes: 1 }],
    };
    const voterDbRow = { id: 'voter-id', uid: 9, name: 'Zed' };

    setupQueryMock([
      // checkAlreadyVoted -> none
      {
        predicate: (sql) => sql.includes('FROM votingnotes') && sql.includes('voterId = $1'),
        result: { rows: [] },
      },
      // getVoterById
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [voterDbRow] },
      },
      // BEGIN
      { predicate: (sql) => sql === 'BEGIN', result: { rows: [] } },
      // INSERT INTO ballots -> ok
      { predicate: (sql) => sql.includes('INSERT INTO ballots'), result: { rows: [{ id: 'b2' }] } },
      // INSERT INTO ballotvotes -> returns empty rows -> triggers rollback
      { predicate: (sql) => sql.includes('INSERT INTO ballotvotes'), result: { rows: [] } },
      // ROLLBACK should be called by function - simulate result
      { predicate: (sql) => sql === 'ROLLBACK', result: { rows: [] } },
    ]);

    const res = await createBallot(ballot, voterDbRow.uid);
    expect(res).toBe(undefined);
    // sicherstellen, dass ROLLBACK ausgeführt wurde
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls.some((s) => s === 'ROLLBACK')).toBeTruthy();
  });

  test('on DB error during ballot creation, returns error', async () => {
    const ballot = {
      electionId: 'E1',
      valid: true,
      voteDecision: [],
    };
    const voterDbRow = { id: 'voter-id', uid: 10, name: 'Mary' };

    setupQueryMock([
      // checkAlreadyVoted -> none
      {
        predicate: (sql) => sql.includes('FROM votingnotes') && sql.includes('voterId = $1'),
        result: { rows: [] },
      },
      // getVoterById
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [voterDbRow] },
      },
      // BEGIN
      { predicate: (sql) => sql === 'BEGIN', result: { rows: [] } },
      // Next DB call (INSERT INTO ballots) throws an error
      { predicate: (sql) => sql.includes('INSERT INTO ballots'), throw: new Error('insert fail') },
      // ROLLBACK
      { predicate: (sql) => sql === 'ROLLBACK', result: { rows: [] } },
    ]);

    await expect(createBallot(ballot, voterDbRow.uid)).rejects.toThrowError(
      'Database query failed',
    );
    expect(logger.error).toHaveBeenCalled();
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls.some((s) => s === 'ROLLBACK')).toBeTruthy();
  });

  describe('generateBallotHashes', () => {
    test('hashes ballot correctly', async () => {
      const mock = {
        electionId: 'e1',
        voteDecision: [
          { listnum: 2, votes: 3 },
          { listnum: 1, votes: 5 },
        ],
        valid: true,
        previousHash: 'prevhash123',
      };

      // berechne sortedVotes genauso wie die Implementierung (defensiv)
      const sortedVotes = mock.voteDecision
        .slice() // kopie, damit original nicht verändert wird
        .sort((a, b) => a.listnum - b.listnum)
        .map((v) => `${v.listnum}:${v.votes}`)
        .join('|');

      // readSecret ist gemockt und liefert 'test_secret'
      const BALLOT_SECRET = await readSecret('BALLOT_SECRET');

      // Funktion aufrufen (synchron oder async je nach implementierung)
      const hash = generateBallotHashes({
        electionId: mock.electionId,
        voteDecision: mock.voteDecision,
        valid: mock.valid,
        previousHash: mock.previousHash,
      });

      const expected = crypto
        .createHash('sha256')
        .update(`${mock.previousHash}|${sortedVotes}|${mock.electionId}|${BALLOT_SECRET}`)
        .digest('hex');

      expect(hash).toBe(expected);
    });
  });
});
