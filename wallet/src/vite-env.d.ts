/**
 * Declares the Vite module shapes this extension imports.
 * A script URL, raw markdown, and an inlined PNG each have a module type so TypeScript accepts those imports.
 * This file has no runtime code.
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
