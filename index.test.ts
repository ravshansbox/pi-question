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

test('cancels the prompt when the signal aborts', async () => {
  const { run } = setup();
  const controller = new AbortController();
  const result = run(controller.signal);
  controller.abort();
  const outcome = await Promise.race([
    result,
    new Promise((resolve) => setTimeout(() => resolve('still open'), 50)),
  ]);
  assert.equal((outcome as any).details?.answer, null);
});

test('shows the error instead of Cancelled when no options are given', async () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t) } as any);
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const result = await tool.execute('id', { question: 'Pick', options: [] }, undefined, undefined, {
    mode: 'tui',
  });
  const text = tool.renderResult(result, {}, theme).render(80).join('\n');
  assert.ok(text.includes('No options provided'), text);
});

test('renders a call whose arguments are still streaming', () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t) } as any);
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const lines = tool.renderCall({ options: [{ label: 'Alpha' }, {}] }, theme).render(80);
  assert.ok(!lines.join('\n').includes('undefined'), lines.join('\n'));
});

test('shows the picked number when option labels repeat', async () => {
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
  const pending = tool.execute(
    'id',
    { question: 'Pick', options: [{ label: 'Same' }, { label: 'Same' }] },
    undefined,
    undefined,
    ctx,
  );
  component!.handleInput('\x1b[B');
  component!.handleInput('\r');
  const result = await pending;
  const text = tool.renderResult(result, {}, theme).render(80).join('\n');
  assert.ok(text.includes('2. Same'), text);
});
