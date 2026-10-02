import { SETTING_DEFINITIONS, type SettingKey } from '@jobbank/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingView } from '@/domains/settings';
import { expectNoA11yViolations } from '@/test/a11y';
import { WorkflowSettings } from './WorkflowSettings';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const views: SettingView[] = (Object.keys(SETTING_DEFINITIONS) as SettingKey[]).map((key) => {
  const def = SETTING_DEFINITIONS[key];
  return {
    key,
    label: def.label,
    description: def.description,
    unit: def.unit,
    value: def.default,
    defaultValue: def.default,
    isDefault: true,
    updatedAt: null,
  } as SettingView;
});

const sectionOf = (label: string) =>
  screen.getByRole('heading', { name: label }).closest('form') as HTMLFormElement;

describe('WorkflowSettings', () => {
  it('renders every setting with an accessible editor', async () => {
    const { container } = render(<WorkflowSettings settings={views} />);
    for (const view of views) {
      expect(screen.getByRole('heading', { name: view.label })).toBeInTheDocument();
    }
    await expectNoA11yViolations(container);
  });

  it('saves the follow-up schedule as a list of days', async () => {
    render(<WorkflowSettings settings={views} />);
    const form = sectionOf('Follow-up schedule');
    const save = within(form).getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    const input = within(form).getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '7, 30, 90, 180, 365');
    await userEvent.click(save);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.lastCall!;
    expect(url).toBe('/api/v1/settings/placement.followup_days');
    expect(JSON.parse(init.body)).toEqual({ value: [7, 30, 90, 180, 365] });
  });

  it('saves weekly days off from checkboxes, sorted', async () => {
    render(<WorkflowSettings settings={views} />);
    const form = sectionOf('Weekly days off');
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Saturday' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.lastCall![1].body)).toEqual({ value: [0, 6] });
  });
});
