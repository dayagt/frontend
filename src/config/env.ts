// src/config/env.ts
type Env = {
  VITE_API_URL?: string;
  DEV: boolean;
};

const env = import.meta.env as unknown as Env;

// fallback: localhost en dev, y origin en prod
const fallback = env.DEV ? "http://localhost:3001" : window.location.origin;

// quita el slash final si lo hubiera
const normalize = (u: string) => u.replace(/\/+$/, "");

export const API_BASE = normalize(env.VITE_API_URL ?? fallback);

// helper para construir URLs
export const apiUrl = (path: string) =>
  API_BASE + (path.startsWith("/") ? path : `/${path}`);
