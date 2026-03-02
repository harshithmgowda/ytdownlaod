const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ensureYtDlp, getVideoInfo, buildArgs } = require('./ytdlp');

const router = express.Router();

// In-memory store for active downloads
const downloads = new Map();

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

// Ensure downloads dir exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// GET /api/info?url=...
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error('Error fetching video info:', err.message);
    res.status(500).json({ error: 'Failed to fetch video info' });
  }
});

// POST /api/download — start a download, returns downloadId
router.post('/download', async (req, res) => {
  try {
    const { url, mode, quality, format } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = uuidv4();
    const qualityNum = (quality || '1080p').replace(/\s*\(.*\)/, '');
    const fileFormat = (format || 'mp4').toLowerCase();
    const outputTemplate = path.join(DOWNLOADS_DIR, `${downloadId}.%(ext)s`);

    const downloadState = {
      id: downloadId,
      progress: 0,
      status: 'starting',
      filename: null,
      error: null,
      listeners: [],
    };

    downloads.set(downloadId, downloadState);

    // Start download in background
    (async () => {
      try {
        const yt = await ensureYtDlp();
        const args = buildArgs(url, mode || 'V+A', qualityNum, format || 'MP4', outputTemplate);

        console.log('yt-dlp args:', args.join(' '));

        const ytDlpProcess = yt.exec(args);

        downloadState.status = 'downloading';

        ytDlpProcess.on('progress', (progressData) => {
          if (progressData && progressData.percent !== undefined) {
            downloadState.progress = Math.round(progressData.percent);
          }
          // Notify SSE listeners
          downloadState.listeners.forEach(cb => cb());
        });

        ytDlpProcess.on('ytDlpEvent', (eventType, eventData) => {
          console.log(`[yt-dlp] ${eventType}: ${eventData}`);
        });

        ytDlpProcess.on('error', (err) => {
          console.error('yt-dlp error:', err.message);
          downloadState.status = 'error';
          downloadState.error = err.message;
          downloadState.listeners.forEach(cb => cb());
        });

        ytDlpProcess.on('close', () => {
          // Find the downloaded file
          const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(downloadId));
          if (files.length > 0) {
            downloadState.filename = files[0];
            downloadState.status = 'complete';
            downloadState.progress = 100;
          } else {
            downloadState.status = 'error';
            downloadState.error = 'Download file not found';
          }
          downloadState.listeners.forEach(cb => cb());
        });

      } catch (err) {
        console.error('Download error:', err.message);
        downloadState.status = 'error';
        downloadState.error = err.message;
        downloadState.listeners.forEach(cb => cb());
      }
    })();

    res.json({ downloadId });

  } catch (err) {
    console.error('Error starting download:', err.message);
    res.status(500).json({ error: 'Failed to start download' });
  }
});

// GET /api/download/:id/progress — SSE stream
router.get('/download/:id/progress', (req, res) => {
  const { id } = req.params;
  const downloadState = downloads.get(id);

  if (!downloadState) {
    return res.status(404).json({ error: 'Download not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendUpdate = () => {
    const data = {
      progress: downloadState.progress,
      status: downloadState.status,
      filename: downloadState.filename,
      error: downloadState.error,
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (downloadState.status === 'complete' || downloadState.status === 'error') {
      // Remove listener and close
      const idx = downloadState.listeners.indexOf(sendUpdate);
      if (idx !== -1) downloadState.listeners.splice(idx, 1);
      res.end();
    }
  };

  downloadState.listeners.push(sendUpdate);

  // Send initial state
  sendUpdate();

  // Cleanup on client disconnect
  req.on('close', () => {
    const idx = downloadState.listeners.indexOf(sendUpdate);
    if (idx !== -1) downloadState.listeners.splice(idx, 1);
  });
});

// GET /api/download/:id/file — serve the downloaded file
router.get('/download/:id/file', async (req, res) => {
  const { id } = req.params;
  const downloadState = downloads.get(id);

  if (!downloadState || downloadState.status !== 'complete' || !downloadState.filename) {
    return res.status(404).json({ error: 'File not ready or not found' });
  }

  const filePath = path.join(DOWNLOADS_DIR, downloadState.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  // Get a nicer filename (remove the UUID prefix)
  const ext = path.extname(downloadState.filename);
  const niceFilename = `quicktube-download${ext}`;

  try {
    await res.download(filePath, niceFilename);
  } catch (err) {
    console.error('Error sending file:', err.message);
  }
  // Cleanup: delete file and remove from map after a delay
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { /* ignore */ }
    downloads.delete(id);
  }, 30000);
});

// Cleanup old downloads periodically (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    files.forEach(file => {
      const filePath = path.join(DOWNLOADS_DIR, file);
      const stat = fs.statSync(filePath);
      // Delete files older than 30 minutes
      if (now - stat.mtimeMs > 30 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (e) { /* ignore */ }
}, 30 * 60 * 1000);

module.exports = router;

