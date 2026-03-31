import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Google OAuth
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = (req.query.clientId as string) || process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    // In a real app, exchange code for tokens and save to DB
    // For this demo, we just simulate success
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'Google' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // Microsoft OAuth (365 / Exchange)
  app.get('/api/auth/microsoft/url', (req, res) => {
    const clientId = (req.query.clientId as string) || process.env.MICROSOFT_CLIENT_ID || '';
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/microsoft/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'offline_access Calendars.Read',
      response_mode: 'query'
    });
    res.json({ url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}` });
  });

  app.get('/auth/microsoft/callback', async (req, res) => {
    const { code } = req.query;
    // In a real app, exchange code for tokens and save to DB
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'Microsoft' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // Apple Calendar (CalDAV / App Password Demo)
  app.get('/api/auth/apple/url', (req, res) => {
    // Apple doesn't have a simple OAuth for Calendar. It requires an App-Specific Password.
    // We'll simulate a flow where the user enters their app-specific password in the UI.
    res.json({ url: '/apple-auth-instructions' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
