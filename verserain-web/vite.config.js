import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dailyVerseHandler from './api/daily-verse.js'
import esvPassageHandler from './api/esv-passage.js'
import nivPassageHandler from './api/niv-passage.js'

// Load .env.local so process.env is available for API handlers in dev
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  });
} catch { /* .env.local may not exist */ }

function makeMockRes(res) {
  return {
    statusCode: 200,
    setHeader: (key, value) => res.setHeader(key, value),
    status(code) { this.statusCode = code; return this; },
    json(payload) {
      res.statusCode = this.statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    end() { res.statusCode = this.statusCode; res.end(); }
  };
}

// https://vite.dev/config/
export default defineConfig({
  // phraseSplitter imports the vendored segmenter at the repo root, one level
  // above this app's Vite root, so the dev server must be allowed to read it.
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    {
      name: 'verserain-local-api',
      configureServer(server) {
        server.middlewares.use('/api/daily-verse', async (req, res) => {
          const url = new URL(req.url || '', 'http://127.0.0.1');
          const mockReq = { method: req.method, query: Object.fromEntries(url.searchParams.entries()) };
          await dailyVerseHandler(mockReq, makeMockRes(res));
        });

        server.middlewares.use('/api/esv-passage', async (req, res) => {
          const url = new URL(req.url || '', 'http://127.0.0.1');
          const mockReq = { method: req.method, query: Object.fromEntries(url.searchParams.entries()) };
          await esvPassageHandler(mockReq, makeMockRes(res));
        });

        server.middlewares.use('/api/niv-passage', async (req, res) => {
          const url = new URL(req.url || '', 'http://127.0.0.1');
          const mockReq = { method: req.method, query: Object.fromEntries(url.searchParams.entries()) };
          await nivPassageHandler(mockReq, makeMockRes(res));
        });
      }
    }
  ],
})
