/**
 * setup-env.mjs
 *
 * Liest die Convex-URL aus dem Root-.env.local (automatisch von `npx convex dev` erstellt)
 * und schreibt sie in die App-spezifischen .env.local-Dateien.
 *
 * Aufruf: pnpm setup
 *         node scripts/setup-env.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---- Hilfsfunktionen ----

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  for (const raw of readFileSync(filePath, "utf-8").split("\n")) {
    const line = raw.split("#")[0].trim(); // Kommentare entfernen
    if (!line) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) result[key] = val;
  }
  return result;
}

function mergeAndWrite(filePath, newVars) {
  const existing = parseEnvFile(filePath);
  const merged = { ...existing, ...newVars };
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  console.log(`  ✓  ${filePath.replace(root + "/", "")}`);
}

// ---- Root .env.local auslesen (von Convex erzeugt) ----

const rootEnvPath = resolve(root, ".env.local");
const rootEnv = parseEnvFile(rootEnvPath);

const convexUrl =
  rootEnv["NEXT_PUBLIC_CONVEX_URL"] ||
  rootEnv["CONVEX_URL"];

if (!convexUrl) {
  console.error("");
  console.error("  ✗  Keine Convex-URL in .env.local gefunden.");
  console.error("     Führe zuerst aus:  npx convex dev");
  console.error("     (Strg+C sobald Convex läuft, dann erneut: pnpm setup)");
  console.error("");
  process.exit(1);
}

console.log("");
console.log(`  Convex-URL: ${convexUrl}`);
console.log("  Schreibe App-Konfigurationen...");
console.log("");

// ---- Web-App: apps/web/.env.local ----
mergeAndWrite(resolve(root, "apps/web/.env.local"), {
  NEXT_PUBLIC_CONVEX_URL: convexUrl,
});

// ---- PowerPoint Add-in: apps/powerpoint-addin/.env.local ----
mergeAndWrite(resolve(root, "apps/powerpoint-addin/.env.local"), {
  VITE_CONVEX_URL: convexUrl,
});

console.log("");
console.log("  Fertig! Starte jetzt die Apps:");
console.log("    pnpm dev:web       →  http://localhost:3000");
console.log("    pnpm dev:addin     →  https://localhost:3001");
console.log("");
