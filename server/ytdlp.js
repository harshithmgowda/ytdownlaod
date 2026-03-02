const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp' + (process.platform === 'win32' ? '.exe' : ''));

// Optional cookies support.
// Set ONE of:
// - YTDLP_COOKIES_FILE=/absolute/path/to/cookies.txt (recommended on Render via disk mount)
// - YTDLP_COOKIES="/absolute/path/to/cookies.txt" (alias)
// - YTDLP_COOKIES_B64=... (base64 contents of cookies.txt; will be written to /tmp)
const DEFAULT_COOKIES_TMP = path.join(process.platform === 'win32' ? __dirname : '/tmp', 'ytdlp_cookies.txt');

function resolveCookiesFilePath() {
  const directPath = process.env.YTDLP_COOKIES_FILE || process.env.YTDLP_COOKIES;
  if (directPath && fs.existsSync(directPath)) return directPath;

  const b64 = process.env.YTDLP_COOKIES_B64;
  if (b64) {
    try {
      const content = Buffer.from(b64, 'base64').toString('utf8');
      fs.writeFileSync(DEFAULT_COOKIES_TMP, content, 'utf8');
      return DEFAULT_COOKIES_TMP;
    } catch (e) {
      console.warn('Failed to decode/write YTDLP_COOKIES_B64:', e.message);
    }
  }

  return null;
}

function withOptionalCookies(args) {
  const cookiesPath = resolveCookiesFilePath();
  if (!cookiesPath) return args;
  // Add cookies for authenticated requests / bot-check bypass.
  return [...args, '--cookies', cookiesPath];
}

let ytDlpWrap = null;

async function ensureYtDlp() {
  if (!fs.existsSync(YTDLP_PATH)) {
    console.log('Downloading yt-dlp binary...');
    await YTDlpWrap.downloadFromGithub(YTDLP_PATH);
    console.log('yt-dlp downloaded successfully.');
  }
  if (!ytDlpWrap) {
    ytDlpWrap = new YTDlpWrap(YTDLP_PATH);
  }
  return ytDlpWrap;
}

async function getVideoInfo(url) {
  const yt = await ensureYtDlp();
  const stdout = await yt.execPromise(
    withOptionalCookies([
      url,
      '--dump-json',
      '--no-download',
      '--no-warnings',
    ])
  );
  const info = JSON.parse(stdout);
  return {
    title: info.title,
    thumbnail: info.thumbnail,
    duration: info.duration,
    uploader: info.uploader,
    viewCount: info.view_count,
  };
}

function buildArgs(url, mode, quality, format, outputPath) {
  let args = [url, '-o', outputPath, '--no-warnings', '--progress'];

  // Set ffmpeg location
  const ffmpegPath = require('ffmpeg-static');
  args.push('--ffmpeg-location', path.dirname(ffmpegPath));

  const qualityNum = quality.replace('p', '');

  if (mode === 'AUDIO') {
    args.push('-x'); // extract audio
    const audioFormat = format.toLowerCase() === 'mp3' ? 'mp3' : format.toLowerCase() === 'webm' ? 'vorbis' : 'mp3';
    args.push('--audio-format', audioFormat);
    args.push('--audio-quality', '0'); // best quality
  } else if (mode === 'VIDEO') {
    // Video only (no audio)
    args.push('-f', `bestvideo[height<=${qualityNum}]/best[height<=${qualityNum}]/best`);
    args.push('--merge-output-format', format.toLowerCase());
  } else {
    // V+A mode — video + audio merged
    args.push('-f', `bestvideo[height<=${qualityNum}]+bestaudio/best[height<=${qualityNum}]/best`);
    args.push('--merge-output-format', format.toLowerCase());
  }

  // Add cookies if configured.
  args = withOptionalCookies(args);

  return args;
}

module.exports = { ensureYtDlp, getVideoInfo, buildArgs };
