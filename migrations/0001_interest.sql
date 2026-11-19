-- People who asked to help, from the form on /contribute/. Applied with
-- `wrangler d1 migrations apply openkannada-interest --remote` once the form is approved.
CREATE TABLE interest (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  place TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  areas TEXT NOT NULL,
  experience TEXT NOT NULL,
  hours TEXT NOT NULL,
  kannada TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en'
);
