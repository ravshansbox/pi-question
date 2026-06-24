# pi-question

Question tool extension for pi.

## Install

```json
{
  "extensions": ["github:ravshansbox/pi-question"]
}
```

## Usage

Pi loads the tool from `./index.ts` and registers a `question` tool that shows a multiple-choice prompt in the TUI.

For example, an agent can call `question` with options such as `Ship now`, `Review first`, and `Type something.` so the user can pick one option or enter a custom answer without leaving the session.

This tool is intended for interactive TUI sessions. In non-interactive contexts it cannot display a chooser, so callers should only use it when a live user can respond. The built-in `Type something.` option lets the user enter free text when none of the listed choices fits.

## Development

```bash
npm install
npm run typecheck
```
