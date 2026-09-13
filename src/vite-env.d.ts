/// <reference types="vite/client" />

/** Injected by Vite from package.json — see `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';
declare module '*.svg' {
  const src: string;
  export default src;
}
