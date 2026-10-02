import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidTransitionError } from '../errors';
import { defineMachine } from './state-machine';

type S = 'SUBMITTED' | 'UNDER_VERIFICATION' | 'INFO_REQUESTED' | 'VERIFIED' | 'REJECTED';
type E = 'CLAIM' | 'REQUEST_INFO' | 'RESUBMIT' | 'VERIFY' | 'REJECT' | 'EXPIRE';
type Role = 'VERIFIER' | 'EMPLOYER' | 'STAFF';
interface Ctx {
  allDocumentsAccepted: boolean;
}

// A trimmed version of the M7 company-verification machine.
const verification = defineMachine<S, E, Ctx, Role>({
  name: 'company verification',
  states: ['SUBMITTED', 'UNDER_VERIFICATION', 'INFO_REQUESTED', 'VERIFIED', 'REJECTED'],
  terminal: ['REJECTED'],
  transitions: [
    { from: 'SUBMITTED', event: 'CLAIM', to: 'UNDER_VERIFICATION', actors: ['VERIFIER'] },
    {
      from: 'UNDER_VERIFICATION',
      event: 'REQUEST_INFO',
      to: 'INFO_REQUESTED',
      actors: ['VERIFIER'],
    },
    { from: 'INFO_REQUESTED', event: 'RESUBMIT', to: 'UNDER_VERIFICATION', actors: ['EMPLOYER'] },
    {
      from: 'UNDER_VERIFICATION',
      event: 'VERIFY',
      to: 'VERIFIED',
      actors: ['VERIFIER'],
      guard: (ctx) => ctx.allDocumentsAccepted || 'All required documents must be accepted first',
    },
    {
      from: ['SUBMITTED', 'UNDER_VERIFICATION', 'INFO_REQUESTED'],
      event: 'REJECT',
      to: 'REJECTED',
      actors: ['VERIFIER'],
    },
    { from: 'INFO_REQUESTED', event: 'EXPIRE', to: 'REJECTED' },
  ],
});

const ready = { allDocumentsAccepted: true };

describe('defineMachine', () => {
  it('moves through allowed transitions', () => {
    expect(verification.transition('SUBMITTED', 'CLAIM', ready, ['VERIFIER'])).toBe(
      'UNDER_VERIFICATION',
    );
    expect(verification.transition('UNDER_VERIFICATION', 'VERIFY', ready, ['VERIFIER'])).toBe(
      'VERIFIED',
    );
    expect(verification.transition('INFO_REQUESTED', 'REJECT', ready, ['VERIFIER'])).toBe(
      'REJECTED',
    );
  });

  it('rejects events that are not defined for the current state', () => {
    expect(() => verification.transition('VERIFIED', 'REQUEST_INFO', ready, ['VERIFIER'])).toThrow(
      InvalidTransitionError,
    );
  });

  it('enforces actor ownership (PRD rule 5)', () => {
    expect(() =>
      verification.transition('INFO_REQUESTED', 'RESUBMIT', ready, ['VERIFIER']),
    ).toThrow(ForbiddenError);
    expect(() =>
      verification.transition('SUBMITTED', 'CLAIM', ready, ['EMPLOYER', 'STAFF']),
    ).toThrow(/Only VERIFIER/);
    // Multi-role users pass if any role matches.
    expect(
      verification.transition('INFO_REQUESTED', 'RESUBMIT', ready, ['STAFF', 'EMPLOYER']),
    ).toBe('UNDER_VERIFICATION');
  });

  it('never lets the system fire actor-owned events, but allows unrestricted ones', () => {
    expect(verification.check('SUBMITTED', 'CLAIM', ready, 'system')).toMatchObject({
      ok: false,
      reason: 'forbidden',
    });
    expect(verification.transition('INFO_REQUESTED', 'EXPIRE', ready, 'system')).toBe('REJECTED');
  });

  it('reports guard failures with their reason', () => {
    const blocked = { allDocumentsAccepted: false };
    expect(verification.check('UNDER_VERIFICATION', 'VERIFY', blocked, ['VERIFIER'])).toEqual({
      ok: false,
      reason: 'guard',
      message: 'All required documents must be accepted first',
    });
    expect(() =>
      verification.transition('UNDER_VERIFICATION', 'VERIFY', blocked, ['VERIFIER']),
    ).toThrow('All required documents must be accepted first');
  });

  it('lists the events an actor can fire (drives which buttons the UI shows)', () => {
    expect(verification.availableEvents('UNDER_VERIFICATION', ready, ['VERIFIER']).sort()).toEqual([
      'REJECT',
      'REQUEST_INFO',
      'VERIFY',
    ]);
    expect(
      verification
        .availableEvents('UNDER_VERIFICATION', { allDocumentsAccepted: false }, ['VERIFIER'])
        .sort(),
    ).toEqual(['REJECT', 'REQUEST_INFO']);
    expect(verification.availableEvents('UNDER_VERIFICATION', ready, ['EMPLOYER'])).toEqual([]);
    expect(verification.isTerminal('REJECTED')).toBe(true);
  });

  it('validates the definition at load time', () => {
    expect(() =>
      defineMachine({
        name: 'bad',
        states: ['A', 'B'] as const,
        transitions: [{ from: 'A', event: 'GO', to: 'C' as 'B' }],
      }),
    ).toThrow(/unknown target state "C"/);
    expect(() =>
      defineMachine({
        name: 'bad',
        states: ['A', 'B'] as const,
        terminal: ['B'],
        transitions: [{ from: 'B', event: 'GO', to: 'A' }],
      }),
    ).toThrow(/terminal state "B"/);
    expect(() =>
      defineMachine({
        name: 'bad',
        states: ['A', 'B'] as const,
        transitions: [
          { from: 'A', event: 'GO', to: 'B' },
          { from: 'A', event: 'GO', to: 'A' },
        ],
      }),
    ).toThrow(/duplicate transition/);
  });
});
