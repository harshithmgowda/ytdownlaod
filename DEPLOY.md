er# QuickTube Deployment Guide

Since this app requires **system binaries** (`yt-dlp` via Python, and `ffmpeg`) and depends on **persistent disk access** (temporarily) for merging video and audio files, you cannot easily host it on Vercel or Netlify (which have short timeouts and restricted environments).

The best places to host this are **Render**, **Railway**, or **Fly.io**.

## Option 1: Railway (Recommended for Best Performance)
Railway is excellent for full-stack apps, handles Docker automatically, and typically offers faster builds and better reliability than Render's free tier.

1.  Push your code to GitHub.
2.  Go to [railway.app](https://railway.app/).
3.  "New Project" -> "Deploy from GitHub repo".
4.  Railway will detect the `Dockerfile` and build it automatically.
5.  It will provide a domain (e.g., `quicktube-production.up.railway.app`).

## Option 2: Render (Good Free Tier Alternative)
Render is a great alternative if you need a completely free tier (though it spins down after inactivity).

1.  Push your code to a GitHub repository.
2.  Go to [dashboard.render.com](https://dashboard.render.com/).
3.  Click "New +" -> "Web Service".
4.  Connect your GitHub repo.
5.  **Settings:**
    *   **Runtime:** `Docker` (This is crucial! Do not select Node).
    *   **Region:** Select one close to you.
    *   **Branch:** `main` (or master).
    *   **Environment Variables:** Add `NODE_ENV` = `production`.
6.  Click **Create Web Service**.

> **Why Docker?** Because `yt-dlp` needs Python and `ffmpeg` installed. The included `Dockerfile` handles this automatically.

## Option 3: VPS (DigitalOcean/Linode) - Advanced
If you want total control and lower costs for high traffic:

1.  Create a strict Ubuntu Droplet ($4-6/mo).
2.  SSH into the server.
3.  Install Node.js 18+, Python3, and FFmpeg:
    ```bash
    sudo apt update
    sudo apt install -y nodejs npm python3 ffmpeg
    ```
4.  Clone your repo: `git clone https://github.com/your/repo.git`.
5.  Install dependencies: `npm install`.
6.  Build frontend: `npm run build`.
7.  Start server with PM2:
    ```bash
    npm install -g pm2
    NODE_ENV=production pm2 start index.js --name quicktube
    ```
8.  Setup Nginx as a reverse proxy (standard web server setup).

## Important Notes for Hosting
*   **Disk Space:** Downloads are temporary but take up space. The app cleans up files after 30 minutes, but heavy usage might fill up a small disk.
*   **Timeouts:** Free tiers on Render/Railway might spin down after inactivity (cold starts take 30-60s).
*   **YouTube Blocking:** YouTube sometimes blocks data center IP addresses (like AWS/Google Cloud). Hosting on a VPS or residential proxy might be more reliable long-term if you encounter "Sign in to confirm you're not a bot" errors.



