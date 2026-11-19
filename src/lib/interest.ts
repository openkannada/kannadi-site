// The Worker's side of the interest form: POST /api/interest checks a submission and stores it in D1.
// While the form is closed it refuses every submission before reading it or touching the database.
import { HELP_AREAS, HOURS, KANNADA, type HelpArea } from "../content/interest.ts";

export const INTEREST_PATH = "/api/interest";

/** The few D1 calls the handler makes, so tests can stand in for the database. */
export interface InterestDb {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export interface InterestEnv {
  DB?: InterestDb;
  TURNSTILE_SECRET?: string;
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
    areas: (Array.isArray(input.areas) ? input.areas : [input.areas]).filter((a): a is HelpArea => (HELP_AREAS as readonly unknown[]).includes(a)),
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
export async function turnstileOk(token: string, secret: string, ip: string | null, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!token || !secret) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  const res = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/** Answers POST /api/interest: 503 while closed, 400 for a bad submission, 200 once stored. */
export async function handleInterest(request: Request, env: InterestEnv, open: boolean, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
  if (!open || !env.DB || !env.TURNSTILE_SECRET) return json(503, { error: "closed" });
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid", fields: [] });
  }
  // A person never sees the honeypot field; a bot that fills it is told it worked and nothing is kept.
  if (typeof input.website === "string" && input.website !== "") return json(200, { ok: true });
  const parsed = parseSubmission(input);
  if (!parsed.ok) return json(400, { error: "invalid", fields: parsed.errors });
  const token = typeof input.turnstile === "string" ? input.turnstile : "";
  if (!(await turnstileOk(token, env.TURNSTILE_SECRET, request.headers.get("cf-connecting-ip"), fetcher))) return json(403, { error: "check" });
  const s = parsed.value;
  await env.DB.prepare(
    "INSERT INTO interest (created_at, name, email, place, link, areas, experience, hours, kannada, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(new Date().toISOString(), s.name, s.email, s.place, s.link, s.areas.join(","), s.experience, s.hours, s.kannada, input.lang === "kn" ? "kn" : "en")
    .run();
  return json(200, { ok: true });
}
