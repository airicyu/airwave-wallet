/**
 * This file declares the Vite module shapes the extension imports: a script as a URL, markdown as raw text, and a PNG as an inline string.
 */
/// <reference types="vite/client" />

declare module "*?script&module" {
  const src: string;
  export default src;
}

declare module "*.md?raw" {
  const src: string;
  export default src;
}

declare module "*.png?inline" {
  const src: string;
  export default src;
}
