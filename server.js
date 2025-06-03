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

app.use(cors());

const COOKIE_PATH = path.join(__dirname, 'cookies', 'youtube.com.txt');

// Util: verifică dacă cookie-ul există
const cookieOption = fs.existsSync(COOKIE_PATH)
  ? `--cookies "${COOKIE_PATH}"`
  : '';

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/check-ffmpeg', (req, res) => {
  exec('./bin/ffmpeg -version', (err, stdout) => {
    if (err) return res.status(500).send('ffmpeg not found or not executable');
    res.send(`ffmpeg OK:\n${stdout}`);
  });
});

app.get('/check-ffprobe', (req, res) => {
  exec('./bin/ffprobe -version', (err, stdout) => {
    if (err) return res.status(500).send('ffprobe not found or not executable');
    res.send(`ffprobe OK:\n${stdout}`);
  });
});

app.get('/check-tools', (req, res) => {
  exec('./bin/yt-dlp --version', (err, stdout) => {
    if (err) return res.status(500).send('yt-dlp not found');
    res.send(`yt-dlp OK: ${stdout}`);
  });
});

// 📄 INFO - Formate video disponibile
app.get('/info', (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).send('Missing URL');

  const command = `./bin/yt-dlp --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" --sleep-interval 10 --max-sleep-interval 20 --no-check-certificate -F "${videoURL}"`;
  console.log('Running command:', command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp info error:', error.message);
      console.error('stderr:', stderr);
      return res.status(500).send('Failed to get video info');
    }

    const formats = stdout
      .split('\n')
      .filter(line => /\b(mp4|m4a|webm)\b/.test(line))
      .map(line => line.trim());

    res.json({ formats });
  });
});

// 📥 DOWNLOAD
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
    command = `./bin/yt-dlp ${cookieOption} -x --audio-format mp3 -o "${outputPath}" "${videoURL}"`;
  } else {
    let formatCode;
    switch (quality) {
      case '360': formatCode = '18'; break;
      case '720': formatCode = '136+140'; break;
      case '1080': formatCode = '137+140'; break;
      default: formatCode = 'bestvideo+bestaudio/best';
    }

    command = `./bin/yt-dlp ${cookieOption} -f "${formatCode}" -o "${outputPath}" --ffmpeg-location ./bin "${videoURL}"`;
  }

  console.log('Running download command:', command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Download error:', stderr);
      return res.status(500).json({ error: 'Download failed', stderr });
    }

    res.download(outputPath, (err) => {
      if (err) console.error('Send file error:', err);
      fs.unlinkSync(outputPath); // Șterge fișierul după descărcare
    });
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
