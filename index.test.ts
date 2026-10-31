import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleWidth } from '@earendil-works/pi-tui';
import extension from './index.ts';

type Component = { render(width: number): string[]; handleInput(data: string): void };

function setup() {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
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
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const result = await tool.execute('id', { question: 'Pick', options: [] }, undefined, undefined, {
    mode: 'tui',
  });
  const text = tool.renderResult(result, {}, theme).render(80).join('\n');
  assert.ok(text.includes('No options provided'), text);
});

test('renders a call whose arguments are still streaming', () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const lines = tool.renderCall({ options: [{ label: 'Alpha' }, {}] }, theme).render(80);
  assert.ok(!lines.join('\n').includes('undefined'), lines.join('\n'));
});

test('shows the picked number when option labels repeat', async () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
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

test('aligns descriptions with labels from option 10 onwards', () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
  let component: Component | undefined;
  const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
  const ctx = {
    mode: 'tui',
    ui: {
      custom: (factory: any) =>
        new Promise(() => {
          component = factory({ requestRender() {} }, theme, {}, () => {});
        }),
    },
  };
  const options = Array.from({ length: 10 }, (_, i) => ({
    label: `Label${i + 1}`,
    description: `Desc${i + 1}`,
  }));
  void tool.execute('id', { question: 'Pick', options }, undefined, undefined, ctx);
  const lines = component!.render(80);
  const label = lines.find((line) => line.includes('Label10'))!;
  const description = lines.find((line) => line.includes('Desc10'))!;
  assert.equal(description.indexOf('Desc10'), label.indexOf('Label10'), lines.join('\n'));
});

for (const mode of ['tui', 'rpc', 'json', 'print']) {
  test(`is ${mode === 'tui' ? 'active' : 'inactive'} in ${mode} mode`, async () => {
    let activeTools = ['read', 'question'];
    const handlers: Record<string, (event: unknown, ctx: unknown) => unknown> = {};
    extension({
      registerTool() {},
      on: (event: string, handler: any) => (handlers[event] = handler),
      getActiveTools: () => activeTools,
      setActiveTools: (names: string[]) => (activeTools = names),
    } as any);
    await handlers.session_start?.({ type: 'session_start' }, { mode });
    assert.equal(activeTools.includes('question'), mode === 'tui');
  });
}

test('asks the model to put a recommended option first', () => {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
  const guidelines = tool.promptGuidelines.join('\n');
  assert.ok(guidelines.includes('(Recommended)'), guidelines);
});

function setupEditing() {
  let tool: any;
  extension({ registerTool: (t: unknown) => (tool = t), on() {} } as any);
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
    { question: 'Pick', options: [{ label: 'Review first' }, { label: 'Ship now (Recommended)' }] },
    undefined,
    undefined,
    ctx,
  );
  const press = (...keys: string[]) => keys.forEach((key) => component!.handleInput(key));
  const finish = async () => {
    const result = await pending;
    return {
      content: result.content[0].text as string,
      shown: tool.renderResult(result, {}, theme).render(80).join('\n') as string,
    };
  };
  return { press, finish, render: () => component!.render(80).join('\n') };
}

const down = '\x1b[B';

test('edits an option with Tab and tells the model which option was edited', async () => {
  const { press, finish } = setupEditing();
  press(down, '\t', ...', skip changelog', '\r');
  const { content, shown } = await finish();
  assert.equal(content, 'User edited 2. Ship now (Recommended) to: Ship now, skip changelog');
  assert.ok(shown.includes('(edited) Ship now, skip changelog'), shown);
});

test('reports an unchanged edit as a normal selection', async () => {
  const { press, finish } = setupEditing();
  press(down, '\t', '\r');
  const { content } = await finish();
  assert.equal(content, 'User selected: 2. Ship now (Recommended)');
});

test('Esc while editing goes back to the original option', async () => {
  const { press, finish } = setupEditing();
  press(down, '\t', ...'!', '\x1b', '\r');
  const { content } = await finish();
  assert.equal(content, 'User selected: 2. Ship now (Recommended)');
});

test('Esc after undoing an edit cancels the question', async () => {
  const { press, finish } = setupEditing();
  press(down, '\t', '\x1b', '\x1b');
  const { shown } = await finish();
  assert.ok(shown.includes('Cancelled'), shown);
});

test('Tab replaces text already in the custom input', async () => {
  const { press, finish } = setupEditing();
  press(down, down, ...'draft', '\x1b[A', '\x1b[A', '\t', '\r');
  const { content } = await finish();
  assert.equal(content, 'User selected: 1. Review first');
});

test('shows Tab in the key hints', () => {
  const { render } = setupEditing();
  assert.ok(render().includes('Tab to edit'), render());
});
