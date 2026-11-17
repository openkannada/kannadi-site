# Contributing

Thank you for helping Kannada work better on computers. Fixes of 1 word are as welcome as new pages.

## Sign off your commits

Open Kannada uses the Developer Certificate of Origin (https://developercertificate.org/) in place of a contributor agreement. Add a sign-off to each commit:

```sh
git commit -s
```

This adds a line such as `Signed-off-by: Your Name <you@example.com>`, with your real name and email address. It says that you wrote the change, or have the right to submit it, under the license of the files it touches.

## Licenses

You keep the copyright in what you contribute, and it is shared under the license of the file you change:

- code: MIT OR Apache-2.0;
- page copy and documents: CC BY 4.0;
- `data/words.tsv`: CC BY-SA 4.0;
- fonts: SIL Open Font License 1.1.

`LICENSING.md` and `REUSE.toml` say which applies where, and `reuse lint` checks it.

## Before you open a pull request

Read `AGENTS.md` for the commands, the checks and the writing rules. Run `npm test`, `npm run check`, `npm run build`, `npm run seo-smoke` and `npm run voice-lint`. If you change a page's text, run `npm run page-hashes` and commit the result.
