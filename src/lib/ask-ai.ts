// The Ask AI menu: links that open an assistant with a prompt to read 1 page's markdown mirror.

export interface Assistant {
  name: string;
  /** The assistant's address with the prompt as its query. */
  url: (prompt: string) => string;
}

export const ASSISTANTS: readonly Assistant[] = [
  { name: "ChatGPT", url: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}` },
  { name: "Claude", url: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  { name: "Perplexity", url: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}` },
];

/** Each assistant's link for a page whose markdown mirror is at `markdownUrl`. */
export function askLinks(markdownUrl: string, prompt: (url: string) => string): { name: string; href: string }[] {
  const text = prompt(markdownUrl);
  return ASSISTANTS.map((a) => ({ name: a.name, href: a.url(text) }));
}
