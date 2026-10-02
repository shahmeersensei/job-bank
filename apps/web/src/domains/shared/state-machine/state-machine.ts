import { ForbiddenError, InvalidTransitionError } from '../errors';

/**
 * Guard result: `true` to allow, or a human-readable reason it is blocked
 * (e.g. "Candidate is 10.4 km away; the maximum is 10 km").
 */
export type GuardResult = true | string;

export interface TransitionDef<S extends string, E extends string, C, A extends string> {
  from: S | readonly S[];
  event: E;
  to: S;
  /**
   * Roles allowed to fire this event (PRD rule 5: actor-owned decisions). Omit = any
   * actor or the system. When set, 'system' is NOT allowed — add a separate event for jobs.
   */
  actors?: readonly A[];
  guard?: (context: C) => GuardResult;
}

export interface MachineConfig<S extends string, E extends string, C, A extends string> {
  name: string;
  states: readonly S[];
  /** States with no way out (e.g. PLACED→CLOSED, REJECTED). */
  terminal?: readonly S[];
  transitions: readonly TransitionDef<S, E, C, A>[];
}

/**
 * Who is firing the event: the actor's roles, or 'system' for scheduled jobs
 * (e.g. hold expiry). Required on purpose — forgetting it must not skip the role check.
 */
export type Firer<A extends string> = readonly A[] | 'system';

export type CheckResult<S extends string> =
  | { ok: true; to: S }
  | { ok: false; reason: 'no_transition' | 'forbidden' | 'guard'; message: string };

export interface StateMachine<S extends string, E extends string, C, A extends string> {
  readonly name: string;
  readonly states: readonly S[];
  isTerminal(state: S): boolean;
  /** Checks without throwing — use for UI (which buttons to show). */
  check(from: S, event: E, context: C, firer: Firer<A>): CheckResult<S>;
  /** Returns the next state or throws InvalidTransitionError / ForbiddenError. */
  transition(from: S, event: E, context: C, firer: Firer<A>): S;
  /** Events the given actor can fire right now. */
  availableEvents(from: S, context: C, firer: Firer<A>): E[];
}

const asArray = <T>(value: T | readonly T[]): readonly T[] =>
  Array.isArray(value) ? (value as readonly T[]) : [value as T];

export function defineMachine<
  S extends string,
  E extends string,
  C = void,
  A extends string = string,
>(config: MachineConfig<S, E, C, A>): StateMachine<S, E, C, A> {
  const known = new Set<string>(config.states);
  const terminal = new Set<string>(config.terminal ?? []);
  const index = new Map<string, TransitionDef<S, E, C, A>>();

  // Validate the definition once, at module load, so mistakes fail loudly in tests.
  for (const t of config.transitions) {
    if (!known.has(t.to)) throw new Error(`[${config.name}] unknown target state "${t.to}"`);
    for (const from of asArray(t.from)) {
      if (!known.has(from)) throw new Error(`[${config.name}] unknown source state "${from}"`);
      if (terminal.has(from))
        throw new Error(`[${config.name}] terminal state "${from}" cannot have transitions`);
      const id = `${from}::${t.event}`;
      if (index.has(id))
        throw new Error(`[${config.name}] duplicate transition ${from} --${t.event}-->`);
      index.set(id, t);
    }
  }
  for (const state of terminal) {
    if (!known.has(state)) throw new Error(`[${config.name}] unknown terminal state "${state}"`);
  }

  const check: StateMachine<S, E, C, A>['check'] = (from, event, context, firer) => {
    const t = index.get(`${from}::${event}`);
    if (!t) {
      return {
        ok: false,
        reason: 'no_transition',
        message: new InvalidTransitionError(config.name, from, event).message,
      };
    }
    if (t.actors) {
      const allowed = firer === 'system' ? false : firer.some((role) => t.actors!.includes(role));
      if (!allowed) {
        return {
          ok: false,
          reason: 'forbidden',
          message: `Only ${t.actors.join(' or ')} can do this`,
        };
      }
    }
    if (t.guard) {
      const result = t.guard(context);
      if (result !== true) return { ok: false, reason: 'guard', message: result };
    }
    return { ok: true, to: t.to };
  };

  return {
    name: config.name,
    states: config.states,
    isTerminal: (state) => terminal.has(state),
    check,
    transition(from, event, context, firer) {
      const result = check(from, event, context, firer);
      if (result.ok) return result.to;
      if (result.reason === 'forbidden') throw new ForbiddenError(result.message);
      throw new InvalidTransitionError(
        config.name,
        from,
        event,
        result.reason === 'guard' ? result.message : undefined,
      );
    },
    availableEvents(from, context, firer) {
      const events: E[] = [];
      for (const t of config.transitions) {
        if (asArray(t.from).includes(from) && check(from, t.event, context, firer).ok)
          events.push(t.event);
      }
      return events;
    },
  };
}
