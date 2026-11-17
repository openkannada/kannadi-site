// Starts an illustration's animation the first time it is on screen, by adding .is-in once.
export function watchInView(doc: Document = document): void {
  const items = [...doc.querySelectorAll<Element>("[data-inview]")];
  if (!items.length || !("IntersectionObserver" in globalThis)) return;
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
