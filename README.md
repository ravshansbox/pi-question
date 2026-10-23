# pi-question

Question tool extension for pi.

## Install

```bash
pi install npm:@ravshansbox/pi-question
```

Add `-l` to install it in project settings.

## Usage

Pi loads the extension from `./index.ts`, adapted from pi's `examples/extensions/question.ts`, and registers a `question` tool that shows a multiple-choice prompt in the TUI.

Calls run one at a time, so several questions in one reply are shown one after another.

For example, an agent can call `question` with options such as `Ship now`, `Review first`, and `Type something.` so the user can pick one option or enter a custom answer without leaving the session.

This tool is intended for interactive TUI sessions. In non-interactive contexts it cannot display a chooser, so callers should only use it when a live user can respond. The built-in `Type something.` option lets the user enter free text when none of the listed choices fits.

## Development

```bash
npm install
npm run check
```
