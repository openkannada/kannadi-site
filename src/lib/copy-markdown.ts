/** Copies the markdown at `url` to the clipboard. Safari needs the write started inside the click, so the text arrives as a promise. */
export async function copyMarkdown(url: string): Promise<boolean> {
  const text = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
  });
  // A failed fetch is reported through the clipboard write below; this keeps it from also going unhandled.
  text.catch(() => {});
  try {
    if (!navigator.clipboard) return false;
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
    } else {
      await navigator.clipboard.writeText(await text);
    }
    return true;
  } catch {
    return false;
  }
}
