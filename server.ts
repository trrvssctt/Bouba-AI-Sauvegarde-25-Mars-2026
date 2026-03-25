import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { encrypt, decrypt } from "./src/lib/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "bouba-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 8000;

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://picsum.photos", "https://*.googleusercontent.com"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for Vite/iframes
  }));

  app.use(cookieParser());
  app.use(express.json());

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: "Trop de requêtes, veuillez réessayer plus tard.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Non authentifié" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.clearCookie("session");
      return res.status(401).json({ error: "Session expirée" });
    }
  };

  // RBAC Middleware
  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Accès refusé" });
      }
      next();
    };
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/me", authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // n8n Proxy Chat API
  app.post("/api/chat", async (req, res) => {
    const { chatInput, history, sessionId } = req.body;
    const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.realtechprint.com/workflow/vunsANcNZDPe5ytB/2dbd90?projectId=wUg55olFqefRijk3';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput,
          history,
          sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "N8N Webhook Error" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Google OAuth Endpoints
  app.get('/api/auth/google/url', (req, res) => {
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const redirectUri = `${origin}/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || 'MOCK_CLIENT_ID',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], (req, res) => {
    // In a real app, exchange code for tokens here
    // const { code } = req.query;
    
    // Simulate user data and encrypted token
    const userData = {
      id: "user_123",
      email: "user@example.com",
      name: "Jean Dupont",
      role: "user" // RBAC: user, admin, superadmin
    };

    const sessionToken = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
          <div style="text-align: center; background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #6C3EF4;">Connexion réussie !</h2>
            <p style="color: #64748b;">Bouba synchronise vos données...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
                window.close();
              } else {
                window.location.href = '/dashboard';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("session");
    res.json({ success: true });
  });

  // RGPD: Export Data
  app.get("/api/user/export", authenticate, (req: any, res) => {
    const userData = {
      profile: req.user,
      data: "Toutes vos données exportées ici...",
      timestamp: new Date().toISOString()
    };
    res.json(userData);
  });

  // RGPD: Delete Account
  app.delete("/api/user/account", authenticate, (req: any, res) => {
    // In a real app, delete from Supabase here
    res.clearCookie("session");
    res.json({ success: true, message: "Compte supprimé avec succès (RGPD Art. 17)" });
  });

  // AI generation endpoints (server-side to avoid exposing API keys in browser)
  app.post('/api/generate-briefing', authenticate, async (req, res) => {
    try {
      const { events } = req.body;

      // If no server-side API key is configured, return a safe mock briefing
      if (!process.env.GENERATE_AI_API_KEY) {
        // Simple mock briefing based on events
        const count = Array.isArray(events) ? events.length : 0;
        let busiest = null;
        if (Array.isArray(events) && events.length > 0) {
          const hourCount: Record<string, number> = {};
          events.forEach((ev: any) => {
            const d = new Date(ev.start || ev.startDate || ev.timestamp || ev.date || ev.startDateTime);
            if (!isNaN(d.getTime())) {
              const h = d.getHours();
              hourCount[h] = (hourCount[h] || 0) + 1;
            }
          });
          const entries = Object.entries(hourCount);
          if (entries.length) {
            busiest = entries.sort((a,b) => b[1]-a[1])[0][0];
          }
        }

        const briefing = count === 0
          ? "Votre agenda est vide pour aujourd'hui. Profitez-en pour avancer sur vos tâches prioritaires."
          : `Vous avez ${count} événements aujourd'hui.${busiest !== null ? ` Le créneau le plus chargé semble être autour de ${busiest}h.` : ''} Pensez à prévoir une courte pause entre deux réunions.`;

        return res.json({ success: true, briefing, meta: { mock: true } });
      }

      // TODO: If GENERATE_AI_API_KEY is provided, proxy the request to the real AI provider using server-side key
      // This block is left intentionally generic – implement provider SDK call here using process.env.GENERATE_AI_API_KEY
      return res.status(501).json({ success: false, error: 'Not implemented: server-side AI provider proxy. Set GENERATE_AI_API_KEY and implement provider call.' });
    } catch (err) {
      console.error('generate-briefing error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.post('/api/generate-command', authenticate, async (req, res) => {
    try {
      const { command } = req.body;

      // If no server-side API key, return a simple parsed mock
      if (!process.env.GENERATE_AI_API_KEY) {
        const lc = (command || '').toLowerCase();
        if (lc.includes('crée') || lc.includes('create') || lc.includes('ajoute')) {
          // crude mock: create an event 1 hour from now
          const start = new Date(Date.now() + 60*60*1000).toISOString();
          const end = new Date(Date.now() + 90*60*1000).toISOString();
          return res.json({ success: true, result: {
            action: 'create',
            eventData: {
              title: command.substring(0, 60),
              start,
              end,
              category: 'Meeting',
              participants: [],
              location: '',
              description: command
            }
          }, meta: { mock: true } });
        }

        return res.json({ success: true, result: { action: 'briefing', briefingRequest: true }, meta: { mock: true } });
      }

      return res.status(501).json({ success: false, error: 'Not implemented: server-side AI provider proxy for commands.' });
    } catch (err) {
      console.error('generate-command error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Vite middleware for development - disabled in dev mode when frontend runs separately
  if (process.env.NODE_ENV === "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa", 
    });
    app.use(vite.middlewares);
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // In development, only serve API endpoints - frontend is served by separate Vite dev server
    app.get("/", (req, res) => {
      res.json({ message: "Bouba'ia API Server", status: "running", port: PORT });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
