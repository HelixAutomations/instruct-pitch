export function scrollIntoViewIfNeeded(element: HTMLElement | null, gap = 20) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const needsScroll = rect.bottom > window.innerHeight || rect.top < gap;
  if (needsScroll) {
    const top = Math.max(0, window.scrollY + rect.top - gap);
    window.scrollTo({ top, behavior: 'smooth' });
  }
}