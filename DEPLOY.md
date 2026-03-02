# QuickTube Deployment Guide

This app needs **system binaries** (`yt-dlp`, `ffmpeg`) and **temporary disk** space to merge audio/video.
That’s why serverless hosts like **Vercel/Netlify** aren’t a good fit (short timeouts + restricted runtime).

Below are working options.

## Option 1: Render (Recommended)
Render works well for Dockerized apps and is straightforward for this project.

### 1) Push your code to GitHub
Create a repo and push your code.

### 2) Create a Render Web Service
1. Go to https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Choose **Build and deploy from a Git repository** and select your repo
4. **Runtime:** choose **Docker** (important)
5. **Branch:** `main`

### 3) Service settings (important)
- **Region:** pick one close to you
- **Plan:** Free/Starter (Free may sleep)
- **Environment Variables:**
  - `NODE_ENV=production`
  - (Optional) `PORT=3001` (Render usually injects PORT automatically; our server should listen on it)

### 4) Deploy
Click **Create Web Service**.
Render will build the Docker image and start the app.

### 5) Verify
Open the Render URL and test a download.

#### Troubleshooting: build fails with Node/Vite version errors
- Vite 7 requires Node **20.19+** or **22.12+**.
- Our `Dockerfile` uses `node:22-slim`, so builds on Render should be fine.
- If you still see Node 18 in logs, double-check you selected **Docker runtime** (not Node runtime).

## Option 2: Railway
Railway is also good for Docker deployments.

1. Push your code to GitHub.
2. Go to https://railway.app/
3. **New Project** → **Deploy from GitHub repo**.
4. Railway will detect the `Dockerfile` and build automatically.

## Option 3: Fly.io / VPS (Advanced)
If you want more control or run into YouTube data-center blocking, a VPS can be more reliable.

## Important Notes for Hosting
- **Disk space:** downloads are temporary but can spike usage.
- **Timeouts / sleeping:** free tiers may sleep after inactivity.
- **YouTube blocking:** data center IPs sometimes get bot-check pages.

## Fixing: "Sign in to confirm you’re not a bot" (yt-dlp)
Sometimes YouTube blocks datacenter IPs (including Render/Railway) and yt-dlp will fail with a bot-check message.

This project supports passing cookies to yt-dlp.

### Recommended (Render): mount a cookies file
1. Export YouTube cookies to a `cookies.txt` file (Netscape format). See:
   https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies
2. In Render, add a **Disk** (persistent disk)
3. Upload/put `cookies.txt` on that disk (e.g. `/var/data/cookies.txt`)
4. Set an environment variable:
   - `YTDLP_COOKIES_FILE=/var/data/cookies.txt`

### Alternative: base64 cookies in env var
If you can’t mount a file, you can store cookies as base64 in an env var:
- `YTDLP_COOKIES_B64=<base64 of cookies.txt>`

Notes:
- Cookies can expire; re-export if downloads start failing again.
- Keep cookies private. Treat them like passwords.
