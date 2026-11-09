import '@testing-library/jest-dom/vitest';

// jsdom no implementa estas APIs del navegador que usan Ionic y la app.
window.matchMedia =
  window.matchMedia ||
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

if (!('structuredClone' in globalThis)) {
  (globalThis as { structuredClone: <T>(v: T) => T }).structuredClone = (v) => JSON.parse(JSON.stringify(v));
}
