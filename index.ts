import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import {
  Input,
  Key,
  matchesKey,
  Text,
  visibleWidth,
  wrapTextWithAnsi,
} from '@earendil-works/pi-tui';
import { Type } from 'typebox';

interface OptionWithDesc {
  label: string;
  description?: string;
}

type DisplayOption = OptionWithDesc & { isOther?: boolean };

interface QuestionDetails {
  question: string;
  options: string[];
  answer: string | null;
  wasCustom?: boolean;
}

const OptionSchema = Type.Object({
  label: Type.String({ description: 'Display label for the option' }),
  description: Type.Optional(
    Type.String({ description: 'Optional description shown below label' }),
  ),
});

const QuestionParams = Type.Object({
  question: Type.String({ description: 'The question to ask the user' }),
  options: Type.Array(OptionSchema, { description: 'Options for the user to choose from' }),
});

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'question',
    label: 'Question',
    description:
      'Ask the user a question and let them pick from options. Use when you need user input to proceed.',
    promptSnippet: 'Ask the user a multiple-choice question',
    promptGuidelines: [
      'Use question whenever you ask the user to choose between options; do not list the options in plain text instead.',
    ],
    parameters: QuestionParams,
    executionMode: 'sequential',

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (ctx.mode !== 'tui') {
        return {
          content: [
            { type: 'text', text: 'Error: UI not available (running in non-interactive mode)' },
          ],
          details: {
            question: params.question,
            options: params.options.map((o) => o.label),
            answer: null,
          } as QuestionDetails,
        };
      }

      if (params.options.length === 0) {
        return {
          content: [{ type: 'text', text: 'Error: No options provided' }],
          details: { question: params.question, options: [], answer: null } as QuestionDetails,
        };
      }

      const allOptions: DisplayOption[] = [
        ...params.options,
        { label: 'Type something.', isOther: true },
      ];

      const result = await ctx.ui.custom<{
        answer: string;
        wasCustom: boolean;
        index?: number;
      } | null>((tui, theme, _kb, done) => {
        let optionIndex = 0;
        let cachedLines: string[] | undefined;

        const input = new Input({
          prompt: '',
          placeholder: 'Type something.',
          placeholderStyle: (t) => theme.fg('muted', t),
        });

        function isOnOther() {
          return allOptions[optionIndex]?.isOther === true;
        }

        function refresh() {
          input.focused = isOnOther();
          cachedLines = undefined;
          tui.requestRender();
        }

        function handleInput(data: string) {
          if (matchesKey(data, Key.escape)) {
            done(null);
            return;
          }

          if (matchesKey(data, Key.up)) {
            optionIndex = Math.max(0, optionIndex - 1);
            refresh();
            return;
          }
          if (matchesKey(data, Key.down)) {
            optionIndex = Math.min(allOptions.length - 1, optionIndex + 1);
            refresh();
            return;
          }

          if (matchesKey(data, Key.enter)) {
            const selected = allOptions[optionIndex];
            if (!selected) return;
            if (selected.isOther) {
              const trimmed = input.getValue().trim();
              if (trimmed) done({ answer: trimmed, wasCustom: true });
            } else {
              done({ answer: selected.label, wasCustom: false, index: optionIndex + 1 });
            }
            return;
          }

          if (isOnOther()) {
            input.handleInput(data);
            refresh();
          }
        }

        function render(width: number): string[] {
          if (cachedLines) return cachedLines;

          const lines: string[] = [];
          const renderWidth = Math.max(1, width);

          function addWrapped(text: string) {
            lines.push(...wrapTextWithAnsi(text, renderWidth));
          }

          function addWrappedWithPrefix(prefix: string, text: string) {
            const prefixWidth = visibleWidth(prefix);
            if (prefixWidth >= renderWidth) {
              addWrapped(prefix + text);
              return;
            }
            const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
            const continuationPrefix = ' '.repeat(prefixWidth);
            for (let i = 0; i < wrapped.length; i++) {
              lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
            }
          }

          lines.push(theme.fg('accent', '─'.repeat(renderWidth)));
          addWrappedWithPrefix(' ', theme.fg('text', params.question));
          lines.push('');

          for (const [i, opt] of allOptions.entries()) {
            const selected = i === optionIndex;
            const prefix = selected ? theme.fg('accent', '> ') : '  ';
            const number = `${i + 1}. `;

            if (opt.isOther && selected) {
              const head = prefix + theme.fg('accent', number);
              const inputWidth = Math.max(1, renderWidth - visibleWidth(head));
              lines.push(head + (input.render(inputWidth)[0] ?? ''));
            } else if (opt.isOther) {
              addWrappedWithPrefix(
                prefix,
                theme.fg('text', number + (input.getValue() || opt.label)),
              );
            } else {
              addWrappedWithPrefix(
                prefix,
                theme.fg(selected ? 'accent' : 'text', number + opt.label),
              );
            }

            if (opt.description) {
              addWrappedWithPrefix('     ', theme.fg('muted', opt.description));
            }
          }

          lines.push('');
          addWrappedWithPrefix(
            ' ',
            theme.fg('dim', '↑↓ navigate • Enter to select • Esc to cancel'),
          );
          lines.push(theme.fg('accent', '─'.repeat(renderWidth)));

          cachedLines = lines;
          return lines;
        }

        return {
          render,
          invalidate: () => {
            cachedLines = undefined;
            input.invalidate();
          },
          handleInput,
        };
      });

      const simpleOptions = params.options.map((o) => o.label);

      if (!result) {
        return {
          content: [{ type: 'text', text: 'User cancelled the selection' }],
          details: {
            question: params.question,
            options: simpleOptions,
            answer: null,
          } as QuestionDetails,
        };
      }

      if (result.wasCustom) {
        return {
          content: [{ type: 'text', text: `User wrote: ${result.answer}` }],
          details: {
            question: params.question,
            options: simpleOptions,
            answer: result.answer,
            wasCustom: true,
          } as QuestionDetails,
        };
      }
      return {
        content: [{ type: 'text', text: `User selected: ${result.index}. ${result.answer}` }],
        details: {
          question: params.question,
          options: simpleOptions,
          answer: result.answer,
          wasCustom: false,
        } as QuestionDetails,
      };
    },

    renderCall(args, theme) {
      let text = theme.fg('toolTitle', theme.bold('question ')) + theme.fg('muted', args.question);
      const opts = Array.isArray(args.options) ? args.options : [];
      if (opts.length) {
        const labels = opts.map((o: OptionWithDesc) => o.label);
        const numbered = [...labels, 'Type something.'].map((o, i) => `${i + 1}. ${o}`);
        text += `\n${theme.fg('dim', `  Options: ${numbered.join(', ')}`)}`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as QuestionDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === 'text' ? text.text : '', 0, 0);
      }

      if (details.answer === null) {
        return new Text(theme.fg('warning', 'Cancelled'), 0, 0);
      }

      if (details.wasCustom) {
        return new Text(
          theme.fg('success', '✓ ') +
            theme.fg('muted', '(wrote) ') +
            theme.fg('accent', details.answer),
          0,
          0,
        );
      }
      const idx = details.options.indexOf(details.answer) + 1;
      const display = idx > 0 ? `${idx}. ${details.answer}` : details.answer;
      return new Text(theme.fg('success', '✓ ') + theme.fg('accent', display), 0, 0);
    },
  });
}
