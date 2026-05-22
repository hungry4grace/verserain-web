import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dailyVerseHandler from './api/daily-verse.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'verserain-local-api',
      configureServer(server) {
        server.middlewares.use('/api/daily-verse', async (req, res) => {
          const url = new URL(req.url || '', 'http://127.0.0.1');
          const mockReq = {
            method: req.method,
            query: Object.fromEntries(url.searchParams.entries())
          };
          const mockRes = {
            statusCode: 200,
            setHeader: (key, value) => res.setHeader(key, value),
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(payload) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
            end() {
              res.statusCode = this.statusCode;
              res.end();
            }
          };
          await dailyVerseHandler(mockReq, mockRes);
        });
      }
    }
  ],
})
