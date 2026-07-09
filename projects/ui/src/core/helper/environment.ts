export const isBrowser = 'window' in globalThis;
export const isDevelopment = import.meta.env.DEV;
export const isMobile = isBrowser && 'matchMedia' in window && window.matchMedia("(pointer:coarse)").matches;
