/**
 * Resolves once every <img> inside `container` has finished loading (or
 * failed) — call this before window.print() so photos loaded from Firebase
 * Storage don't get cut off by a fixed timer on a slow connection, which is
 * why print previews sometimes showed blank photo pages.
 */
export function waitForImages(container: HTMLElement | null): Promise<void> {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll('img'));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}
