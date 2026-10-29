# pi-question

Question tool extension for pi.

## Install

```bash
pi install npm:@ravshansbox/pi-question
```

Add `-l` to install it in project settings.

## Usage

Pi loads the extension from `./index.ts`, adapted from pi's `examples/extensions/question.ts`:

- `question` tool that shows a multiple-choice prompt in the TUI

Calls run one at a time, so several questions in one reply are shown one after another.

For example, an agent can call `question` with options such as `Ship now`, `Review first`, and `Type something.` so the user can pick one option or enter a custom answer without leaving the session.

If the model has a recommendation, it puts that option first and adds ` (Recommended)` to its label, so the cursor starts on it.

This tool is only available in interactive TUI sessions. In RPC, JSON and print modes it is removed from the active tools, so the model does not see it. The built-in `Type something.` option lets the user enter free text when none of the listed choices fits.

## Development

```bash
npm install
npm run check
```
