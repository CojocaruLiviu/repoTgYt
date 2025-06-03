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

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/check-tools', (req, res) => {
  exec('./bin/yt-dlp --version', (err, stdout) => {
    if (err) return res.status(500).send('yt-dlp not found');
    res.send(`yt-dlp OK: ${stdout}`);
  });
});

app.get('/info', (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).send('Missing URL');

  // Comandă yt-dlp cu cookies și user-agent, plus verbose pentru debug
  const command = `./bin/yt-dlp --cookies ./cookies.txt --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" --verbose -F "${videoURL}"`;
  console.log('Running command:', command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp info error:', error.message);
      console.error('stderr:', stderr);
      return res.status(500).json({
        error: 'Failed to get video info',
        message: error.message,
        stderr,
      });
    }

    // Extragem formatele video relevante (mp4, m4a, webm)
    const formats = stdout
      .split('\n')
      .filter(line => /\b(mp4|m4a|webm)\b/.test(line))
      .map(line => line.trim());

    res.json({ formats });
  });
});

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
    command = `./bin/yt-dlp --cookies ./cookies.txt --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -x --audio-format mp3 -o "${outputPath}" "${videoURL}"`;
  } else {
    let formatCode;
    switch (quality) {
      case '360': formatCode = '18'; break;
      case '720': formatCode = '136+140'; break;
      case '1080': formatCode = '137+140'; break;
      default: formatCode = 'bestvideo+bestaudio/best';
    }

    command = `./bin/yt-dlp --cookies ./cookies.txt --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -f "${formatCode}" -o "${outputPath}" --ffmpeg-location ./bin "${videoURL}"`;
  }

  console.log('Running download command:', command);

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
  console.log(`✅ Server running on port ${PORT}`);
});
