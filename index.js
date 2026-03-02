const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./server/routes');
const { ensureYtDlp } = require('./server/ytdlp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve frontend if a production build exists.
// (Some hosts don't set NODE_ENV=production, so we detect dist/ instead.)
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  // Express 5 (path-to-regexp v6) no longer supports a bare "*" route.
  // Use a catch-all regex instead to serve the SPA for any non-API path.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`✨ QuickTube backend running on http://localhost:${PORT}`);

  // Pre-download yt-dlp binary if needed
  try {
    await ensureYtDlp();
    console.log('✅ yt-dlp is ready');
  } catch (err) {
    console.error('⚠️  Failed to initialize yt-dlp:', err.message);
    console.error('   Downloads will attempt to initialize yt-dlp on first use.');
  }
});
