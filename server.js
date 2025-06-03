import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🪟 Setări pentru Windows
const YT_DLP = 'bin\\yt-dlp.exe';
const FFMPEG = 'bin\\ffmpeg.exe';

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ Server is running');
});

// Check tools
app.get('/check-tools', (req, res) => {
  exec(`${YT_DLP} --version`, (err, stdout) => {
    if (err) return res.status(500).send('yt-dlp not found');
    res.send(`yt-dlp OK: ${stdout}`);
  });
});

// INFO endpoint cu cookies-from-browser
app.get('/info', (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).send('Missing URL');

const command = `${YT_DLP} --cookies cookies/cookies.txt --ffmpeg-location ${FFMPEG} -F "${videoURL}"`;
  console.log('🔍 Running:', command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp info error:', stderr);
      return res.status(500).json({
        error: 'Failed to get video info',
        message: error.message,
        stderr: stderr,
      });
    }

    const formats = stdout
      .split('\n')
      .filter(line => /\b(mp4|m4a|webm)\b/.test(line))
      .map(line => line.trim());

    res.json({ formats });
  });
});

// DOWNLOAD endpoint
app.get('/download', (req, res) => {
  const videoURL = req.query.url;
  const format = req.query.format || 'mp4';
  const quality = req.query.quality || 'best';

  if (!videoURL) return res.status(400).send('Missing URL');

  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const filename = `video_${Date.now()}.${ext}`;
  const outputPath = path.join(__dirname, filename);

  let command;

  if (format === 'mp3') {
    command = `${YT_DLP} --cookies-from-browser chrome -x --audio-format mp3 -o "${outputPath}" "${videoURL}"`;
  } else {
    let formatCode;
    switch (quality) {
      case '360': formatCode = '18'; break;
      case '720': formatCode = '136+140'; break;
      case '1080': formatCode = '137+140'; break;
      default: formatCode = 'bestvideo+bestaudio/best';
    }

    command = `${YT_DLP} --cookies-from-browser chrome -f "${formatCode}" -o "${outputPath}" --ffmpeg-location ${FFMPEG} "${videoURL}"`;
  }

  console.log('⬇️ Downloading with command:', command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Download error:', stderr);
      return res.status(500).send('Download failed');
    }

    res.download(outputPath, (err) => {
      if (err) console.error('Send file error:', err);
      fs.unlinkSync(outputPath);
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
