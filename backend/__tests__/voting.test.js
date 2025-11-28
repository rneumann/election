import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
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

import {
  getElections,
  getElectionById,
  getVoterById,
  createBallot,
} from '../src/service/voter.service.js';

import { logger } from '../src/conf/logger/logger.js';
import { client } from '../src/database/db.js';

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
    expect(res).toEqual({ ok: true, data: rows });
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
    expect(res).toEqual({ ok: true, data: rows });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('vn.voterId = $1');
    expect(params).toEqual(['u001']);
  });

  test('returns ok:false and data:undefined when no elections found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows: [] },
      },
    ]);

    const res = await getElections();
    expect(res).toEqual({ ok: false, data: undefined });
  });

  test('handles DB errors gracefully', async () => {
    setupQueryMock([
      {
        predicate: () => true,
        throw: new Error('DB fail'),
      },
    ]);

    const res = await getElections(undefined, 'u001');
    expect(res).toEqual({ ok: false, data: undefined });
    expect(logger.error).toHaveBeenCalled();
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
    expect(res).toEqual({ ok: true, data: row });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM elections'), ['e1']);
  });

  test('returns ok:false and data:null when not found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        result: { rows: [] },
      },
    ]);

    const res = await getElectionById('missing');
    expect(res).toEqual({ ok: false, data: null });
  });

  test('handles DB error and logs stack', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM elections'),
        throw: new Error('boom'),
      },
    ]);

    const res = await getElectionById('e1');
    expect(res.ok).toBe(false);
    expect(res.data).toBeUndefined();
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
    expect(res).toEqual({ ok: true, data: voter });
    expect(logger.debug).toHaveBeenCalled();
  });

  test('returns ok:false when not found', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [] },
      },
    ]);

    const res = await getVoterById(123);
    expect(res).toEqual({ ok: false, data: undefined });
  });

  test('handles DB error and returns ok:false', async () => {
    setupQueryMock([
      {
        predicate: (sql) => sql.includes('FROM voters'),
        throw: new Error('db error'),
      },
    ]);

    const res = await getVoterById(123);
    expect(res).toEqual({ ok: false, data: undefined });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('Data service - createBallot', () => {
  test('creates ballot, votes and votingnote, commits transaction', async () => {
    const ballot = {
      electionId: 'E1',
      valid: true,
      voteDecision: [
        { listnum: 1, votes: 2 },
        { listnum: 2, votes: 1 },
      ],
    };

    const voterDbRow = { id: 'voter-id', uid: 7, name: 'Bob' };

    setupQueryMock([
      // checkAlreadyVoted
      {
        predicate: (sql) => sql.includes('FROM votingnotes') && sql.includes('voterId = $1'),
        result: { rows: [] },
      },
      // BEGIN
      {
        predicate: (sql) => sql === 'BEGIN',
        result: { rows: [] },
      },
      // INSERT INTO ballots
      {
        predicate: (sql) =>
          sql.includes('INSERT INTO ballots') || sql.includes('INSERT INTO ballots'),
        result: { rows: [{ id: 'ballot-1' }] },
      },
      // INSERT INTO ballotvotes (will be called twice)
      {
        predicate: (sql) => sql.includes('INSERT INTO ballotvotes'),
        result: { rows: [{ id: 'bv' }] },
      },
      // INSERT INTO votingnotes
      {
        predicate: (sql) => sql.includes('INSERT INTO votingnotes'),
        result: { rows: [{ id: 'vn' }] },
      },
      // COMMIT
      {
        predicate: (sql) => sql === 'COMMIT',
        result: { rows: [] },
      },
      // getVoterById query (called earlier) - selects from voters
      {
        predicate: (sql) => sql.includes('FROM voters'),
        result: { rows: [voterDbRow] },
      },
    ]);

    const res = await createBallot(ballot, voterDbRow.uid);
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ id: 'ballot-1' });
    // prüfe, dass BEGIN und COMMIT aufgerufen wurden (mindestens einmal)
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls.some((s) => s === 'BEGIN')).toBeTruthy();
    expect(calledSqls.some((s) => s === 'COMMIT')).toBeTruthy();
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
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.message).toMatch(/Voter not found/i);
    expect(res.data).toBeUndefined();
  });

  test('rolls back when ballotvotes insert fails and returns ok:false', async () => {
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
    expect(res.ok).toBe(false);
    // sicherstellen, dass ROLLBACK ausgeführt wurde
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls.some((s) => s === 'ROLLBACK')).toBeTruthy();
  });

  test('on DB error during createBallot it rolls back and returns ok:false', async () => {
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

    const res = await createBallot(ballot, voterDbRow.uid);
    expect(res.ok).toBe(false);
    expect(logger.error).toHaveBeenCalled();
    const calledSqls = queryMock.mock.calls.map((c) => c[0]);
    expect(calledSqls.some((s) => s === 'ROLLBACK')).toBeTruthy();
  });
});
