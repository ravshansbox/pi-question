# pi-question

Question tool extension for [pi](https://pi.dev).

This package adds a `question` tool that lets the agent ask one multiple-choice question in the TUI and optionally accept a custom typed answer.

It is packaged from Pi's upstream example extension at `examples/extensions/question.ts`.

## Install

From this repository:

```bash
pi install ./path/to/pi-question
```

Or use it temporarily:

```bash
pi -e ./path/to/pi-question
```

## What it provides

The extension registers a `question` tool with this input shape:

```ts
{
  question: string;
  options: Array<{
    label: string;
    description?: string;
  }>;
}
```

The user can:

- Navigate options with `↑` and `↓`
- Select with `Enter`
- Choose `Type something.` to enter a custom answer
- Cancel with `Esc`

## Notes

The interactive selector requires pi TUI mode. In non-interactive modes, the tool returns an error result instead of prompting.

Pi loads this package via the manifest in `package.json`:

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```
