# Editor tests

These tests drive the built editor in real browsers, the way people use it: key presses, typed text, `insertText`,
keyboard compositions, taps, paste, open and save.

```sh
npm run build
npx playwright install chromium firefox webkit
npx playwright test
```

`npx playwright test --project=webkit-390` runs 1 project, and `-g "til"` the tests whose names match.

## What runs where

| Project | Browser | Size | Runs |
| --- | --- | --- | --- |
| chromium-1280, firefox-1280, webkit-1280 | Chromium, Firefox, WebKit | 1280 wide | everything |
| chromium-360, webkit-390 | Chromium, WebKit with touch | 360 and 390 wide | everything |
| chromium-1440, chromium-1920 | Chromium | 1440 and 1920 wide | layout checks |
| chromium-1280-dark, webkit-390-dark | Chromium, WebKit | 1280 and 390 wide, dark | layout checks |

The layout checks are the tests tagged `@layout`. After each step they measure the toolbar, the band that hides text
under it, the suggestions and the caret line, and fail when:

- the caret line is off screen or under the toolbar, the band or the suggestions;
- the suggestions cover the toolbar;
- any text shows under the toolbar without the band hiding it.

## The files

- `editor.ts`: opening the editor, choosing a mode, reading the text, and measuring the layout.
- `typing.spec.ts`: every mode, the first letter, input methods, Backspace, Enter, punctuation, undo and redo, and
  switching mode mid-word.
- `suggest.spec.ts`: what English-letter typing suggests, and choosing by click, tap, Tab and Space.
- `files.spec.ts`: paste, open, save and reopen in every format, the 2002 sample, F8 and the fix card, and keeping
  the text across a reload.
- `layout.spec.ts`: the layout checks, and the Kannada editor at `/kn/`.
- `a11y.spec.ts`: an axe scan, names for screen readers, focus order and keyboard-only use.
