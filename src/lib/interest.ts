// The Worker's side of the interest form: POST /api/interest checks a submission and stores it in D1.
// While the form is closed it refuses every submission before reading it or touching the database.
import { HELP_AREAS, HOURS, KANNADA, type HelpArea } from "../content/interest.ts";

export const INTEREST_PATH = "/api/interest";

/** The honeypot's field name: one no autofill fills, so a person never trips it. */
export const HONEYPOT = "ok_fax_extension";

/** The largest body read, in bytes; a real submission is under 2 KB. */
export const MAX_BODY = 8192;

/** The few D1 calls the handler makes, so tests can stand in for the database. */
export interface InterestDb {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export interface InterestEnv {
  DB?: InterestDb;
  TURNSTILE_SECRET?: string;
}

/** Where submissions may come from: the site itself, or a local dev server. */
export interface InterestOrigin {
  host: string;
}

export interface Submission {
  name: string;
  email: string;
  place: string;
  link: string;
  areas: HelpArea[];
  experience: string;
  hours: string;
  kannada: string;
  consent: true;
}

/** The longest each text field may be, in characters. */
export const LIMITS = { name: 120, email: 254, place: 120, link: 300, experience: 600 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** A submission from the form's fields, or the names of the fields that are missing or wrong. */
export function parseSubmission(input: Record<string, unknown>): { ok: true; value: Submission } | { ok: false; errors: string[] } {
  const text = (key: keyof typeof LIMITS) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const errors: string[] = [];
  const value = {
    name: text("name"),
    email: text("email"),
    place: text("place"),
    link: text("link"),
    experience: text("experience"),
    areas: [...new Set(Array.isArray(input.areas) ? input.areas : [input.areas])].filter((a): a is HelpArea => (HELP_AREAS as readonly unknown[]).includes(a)),
    hours: typeof input.hours === "string" ? input.hours : "",
    kannada: typeof input.kannada === "string" ? input.kannada : "",
    consent: input.consent === true || input.consent === "on" || input.consent === "yes",
  };
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const required = key !== "link";
    if ((required && !value[key]) || value[key].length > LIMITS[key]) errors.push(key);
  }
  if (value.email && !EMAIL.test(value.email)) errors.push("email");
  if (value.link && !/^https?:\/\/\S+$/.test(value.link)) errors.push("link");
  if (!value.areas.length) errors.push("areas");
  if (!(HOURS as readonly string[]).includes(value.hours)) errors.push("hours");
  if (!(KANNADA as readonly string[]).includes(value.kannada)) errors.push("kannada");
  if (!value.consent) errors.push("consent");
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  return { ok: true, value: { ...value, consent: true } };
}

/** Asks Cloudflare whether the Turnstile token came from a person on this page. */
export async function turnstileOk(token: string, secret: string, ip: string | null, host: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!token || !secret) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  const res = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean; hostname?: string };
  return data.success === true && (data.hostname === host || LOCAL.test(data.hostname ?? ""));
}

/** The host of an Origin header, or "" for a missing or opaque one such as "null". */
const hostOf = (from: string | null) => {
  try {
    return from ? new URL(from).hostname : "";
  } catch {
    return "";
  }
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

/** Answers POST /api/interest: 503 while closed, 400 for a bad submission, 200 once stored. */
export async function handleInterest(request: Request, env: InterestEnv, open: boolean, origin: InterestOrigin, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST", "x-robots-tag": "noindex" } });
  if (!open || !env.DB || !env.TURNSTILE_SECRET) return json(503, { error: "closed" });
  // Only the site's own page posts here: JSON, from the canonical origin, and small.
  const from = request.headers.get("origin");
  const sameSite = from === `https://${origin.host}` || LOCAL.test(hostOf(from));
  if (!sameSite || !request.headers.get("content-type")?.startsWith("application/json")) return json(403, { error: "origin" });
  if (Number(request.headers.get("content-length") ?? MAX_BODY + 1) > MAX_BODY) return json(413, { error: "too large" });
  let input: Record<string, unknown>;
  try {
    const body: unknown = JSON.parse(await request.text());
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    input = body as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid", fields: [] });
  }
  // A person never sees the honeypot field; a bot that fills it is told it worked and nothing is kept.
  if (typeof input[HONEYPOT] === "string" && input[HONEYPOT] !== "") return json(200, { ok: true });
  const parsed = parseSubmission(input);
  if (!parsed.ok) return json(400, { error: "invalid", fields: parsed.errors });
  const token = typeof input.turnstile === "string" ? input.turnstile : "";
  try {
    if (!(await turnstileOk(token, env.TURNSTILE_SECRET, request.headers.get("cf-connecting-ip"), origin.host, fetcher))) return json(403, { error: "check" });
    const s = parsed.value;
    await env.DB.prepare(
      "INSERT INTO interest (created_at, name, email, place, link, areas, experience, hours, kannada, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(new Date().toISOString(), s.name, s.email, s.place, s.link, s.areas.join(","), s.experience, s.hours, s.kannada, input.lang === "kn" ? "kn" : "en")
      .run();
  } catch {
    return json(502, { error: "unavailable" });
  }
  return json(200, { ok: true });
}
