import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe-core against a rendered container. Colour contrast is excluded because
 * jsdom does not compute styles; contrast is guaranteed by the token palette instead.
 */
export async function expectNoA11yViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`,
  );
  expect(summary).toEqual([]);
}
