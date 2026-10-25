import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleWidth } from '@earendil-works/pi-tui';
import extension from './index.ts';

type Component = { render(width: number): string[]; handleInput(data: string): void };

function setup() {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t) } as any);
  let component: Component | undefined;
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const ctx = {
    mode: 'tui',
    ui: {
      custom: (factory: any) =>
        new Promise((resolve) => {
          component = factory({ requestRender() {} }, theme, {}, resolve);
        }),
    },
  };
  const run = (signal?: AbortSignal) =>
    tool.execute(
      'id',
      {
        question: 'Pick one option from the list below',
        options: [{ label: 'Alpha beta gamma delta' }],
      },
      signal,
      undefined,
      ctx,
    );
  return { run, component: () => component! };
}

test('re-renders to fit a narrower width', () => {
  const { run, component } = setup();
  void run();
  component().render(80);
  for (const line of component().render(20)) {
    assert.ok(visibleWidth(line) <= 20, line);
  }
});
