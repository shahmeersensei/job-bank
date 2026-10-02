import { describe, expect, it } from 'vitest';
import { resolveCorrelationId } from './correlation';

const UUID = /^[0-9a-f-]{36}$/;

describe('resolveCorrelationId', () => {
  it('keeps a well-formed incoming id', () => {
    expect(resolveCorrelationId('req-1234abcd')).toBe('req-1234abcd');
  });

  it.each([null, undefined, '', 'short', 'has spaces in it', 'x'.repeat(65), 'evil\r\nheader: 1'])(
    'replaces unsafe value %j with a uuid',
    (value) => {
      expect(resolveCorrelationId(value)).toMatch(UUID);
    },
  );
});
