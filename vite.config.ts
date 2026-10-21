import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { onRequestPost as validateKey } from './functions/api/validate-gemini-key.js';
import { onRequestPost as generate } from './functions/api/gemini.js';

const localResearchApi = (): Plugin => ({
  name: 'local-research-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const handler = req.url === '/api/validate-gemini-key' ? validateKey : req.url === '/api/gemini' ? generate : null;
      if (!handler) return next();
      if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
      try {
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 220000) { res.writeHead(413); res.end(); return; } chunks.push(Buffer.from(chunk)); }
        const request = new Request(`http://127.0.0.1${req.url}`, {method:'POST',headers:{'Content-Type':'application/json'},body:Buffer.concat(chunks).toString('utf8')});
        const response = await handler({request,env:{}});
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      } catch { res.writeHead(502, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify({error:'The local research connection failed. Please retry.'})); }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    localResearchApi(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
