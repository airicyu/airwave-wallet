/// <reference types="vite/client" />

declare module "*?script&module" {
  const src: string;
  export default src;
}

declare module "*.md?raw" {
  const src: string;
  export default src;
}
