# Product

<!-- impeccable:product-schema 1 -->

Facts marked "(inferred)" come from strategy and competitor research rather than from user interviews.

## Platform

web

## Stack

Astro 7 for static pages, Tailwind CSS 4 with design tokens as CSS variables, and the editor as a client island over the kannadi library compiled to WebAssembly. shadcn patterns are allowed inside islands. Chosen in the strategy; Meta's Astryx was considered and set aside while it is in beta.

## Users

- People who need to type Kannada on a phone or computer and do not have, or do not know, a Kannada keyboard. Most of this traffic is on phones (inferred from search data).
- Office staff, teachers, journalists and typists holding documents typed in the old Nudi, Baraha and Akruti fonts, which show as Latin symbols such as `PÀ£ÀßqÀ` everywhere else. Their job is to turn those files into Unicode Kannada, or to produce Nudi text for forms and offices that still need it.

## Product Purpose

A free Kannada editor that works in the browser with nothing uploaded. It converts legacy font text to Unicode, types Kannada from English letters, marks what could not be converted and offers fixes, counts aksharas and words, and saves Word, web, text and Nudi files. Success: someone who arrives from a search finishes their document on the page, on any device.

## Positioning

The pages that rank today are old, ad-funded wrappers around Google's transliteration service or 1-page jQuery converters. kannadi converts whole Word, HTML and text files, shows exactly which glyphs and syllables failed with checked fixes, converts Unicode back to Nudi, and runs offline from its own WebAssembly library (inferred from the competitor report).

## Operating Context

- Arrival from Google on a single-purpose landing page: "nudi to unicode", "kannada typing", "english to kannada typing".
- Documents from the early 2000s: government pages and Word files set in BRH Kannada, Nudi or Akruti.
- Phone keyboards that commit whole words with a space; desktop users who expect Ctrl+O, Ctrl+S and Ctrl+Z.
- AI assistants and browser agents that read the page as markdown or call its WebMCP tools.

## Capabilities and Constraints

- Open TXT, DOCX and HTML; paste with automatic conversion and a way to keep the paste as it was.
- Nudi, Baraha and Akruti to Unicode; Unicode to Nudi as a file or the clipboard.
- Inline marks for unknown glyphs and malformed syllables, a problem count, and a popover with checked fixes.
- Typing with Kannada keys, Baraha letters or ISO 15919.
- Normalize, Modernize, akshara, word and character counts, autosave in the browser, keyboard shortcuts.
- No tracking, cookies or third-party requests. A strict Content-Security-Policy.
- Hosted at https://openkannada.org on Cloudflare Workers, deployed from CI, and kept out of search results until launch.

## Brand Commitments

- Name: kannadi, with the Kannada wordmark ಕನ್ನಡಿ ("mirror").
- Modern and polished, using newer elements such as Liquid Glass where it makes sense; humane, clear and welcoming; no over-disclaimers or over-labeling in any public copy; super mobile friendly.
- Kannada set large in self-hosted Neha Sans and Neha Serif, our own fonts, with Noto Sans for Latin.
- Footer credit: "If kannadi helps your project, a mention or a link to prasad.tech is appreciated."
- Writing: plain American English, digits for numbers, no em dashes, no hype.

## Evidence on Hand

- Real legacy text: Karnataka RDPR scheme pages from December 2002, set in BRH Kannada.
- Measured: 9,029 of 9,047 words from 35 government pages from 2002 encode back to the exact typed bytes.
- No measured error rate on a checked test set yet. Do not claim one.
- No users, testimonials or press yet. Do not invent them.

## Product Principles

1. The text is the hero. Tools appear when they are needed and recede when they are not.
2. Show what failed, never hide it. Every unconverted glyph and broken syllable is visible and fixable.
3. Nothing leaves the device.
4. Answer first: each page says what it does in 1 sentence, then lets you do it.
5. Fast on a cheap phone on a slow network.

## Accessibility & Inclusion

WCAG 2.2 AA. Full keyboard use, visible focus, screen reader labels for problem marks, reduced motion respected, and text that scales.
