export function scrollIntoViewIfNeeded(element: HTMLElement | null, gap = 20) {
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const isMobile = window.innerWidth <= 768;
  
  // On mobile, be more aggressive about scrolling to ensure form is visible
  if (isMobile) {
    // Always scroll on mobile to ensure the form area is at the top
    const top = Math.max(0, window.scrollY + rect.top - 10);
    window.scrollTo({ top, behavior: 'smooth' });
  } else {
    // Desktop behavior - only scroll if needed
    const needsScroll = rect.bottom > window.innerHeight || rect.top < gap;
    if (needsScroll) {
      const top = Math.max(0, window.scrollY + rect.top - gap);
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
}