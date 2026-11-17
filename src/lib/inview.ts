// Starts an illustration's animation the first time it is on screen, by adding .is-in once.
// The head script hides art not yet started (.illo-wait) and shows it after 3s unless this has taken over (.illo-ready).
export function watchInView(doc: Document = document): void {
  const root = doc.documentElement;
  const items = [...doc.querySelectorAll<Element>("[data-inview]")];
  if (!("IntersectionObserver" in globalThis)) {
    root.classList.remove("illo-wait");
    return;
  }
  root.classList.add("illo-ready");
  if (!items.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.35 },
  );
  for (const el of items) io.observe(el);
}
