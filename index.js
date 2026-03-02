const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./server/routes');
const { ensureYtDlp } = require('./server/ytdlp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
