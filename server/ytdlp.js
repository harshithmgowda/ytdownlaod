const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp' + (process.platform === 'win32' ? '.exe' : ''));

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
  const stdout = await yt.execPromise([
    url,
    '--dump-json',
    '--no-download',
    '--no-warnings',
  ]);
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
  const args = [url, '-o', outputPath, '--no-warnings', '--progress'];

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

  return args;
}

module.exports = { ensureYtDlp, getVideoInfo, buildArgs };

