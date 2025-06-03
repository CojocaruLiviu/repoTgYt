const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());

app.get('/download', (req, res) => {
  const videoURL = req.query.url;
  const format = req.query.format || 'mp4';       // default mp4
  const quality = req.query.quality || 'best';    // default best quality

  if (!videoURL) return res.status(400).send('Missing URL');

  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const filename = `video_${Date.now()}.${ext}`;
  const outputPath = path.join(__dirname, filename);

  // Construiește comanda yt-dlp în funcție de parametri
  let command;

  if (format === 'mp3') {
    // descarcă doar audio, convertește în mp3
    command = `./bin/yt-dlp -x --audio-format mp3 -o "${outputPath}" "${videoURL}"`;
  } else {
    // mapare simplă calitate => yt-dlp format code
    let formatCode;
    switch (quality) {
      case '360':
        formatCode = '18'; // video + audio combinat
        break;
      case '720':
        formatCode = '136+140'; // 720p video + audio
        break;
      case '1080':
        formatCode = '137+140'; // 1080p video + audio
        break;
      default:
        formatCode = 'bestvideo+bestaudio/best'; // fallback
    }

    command = `./bin/yt-dlp -f "${formatCode}" -o "${outputPath}" --ffmpeg-location ./bin "${videoURL}"`;
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp error:', error.message);
      console.error('stderr:', stderr);
      return res.status(500).send('yt-dlp download failed');
    }

    res.download(outputPath, (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(outputPath);
    });
  });
});

app.get('/info', (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).send('Missing URL');

  const command = `"${__dirname}\\yt-dlp.exe" -F "${videoURL}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp info error:', error.message);
      return res.status(500).send('Failed to get video info');
    }

    // Extragem doar liniile relevante care conțin formate video + audio
    const formats = stdout
      .split('\n')
      .filter(line => /\b(mp4|m4a|webm)\b/.test(line)) // doar formate uzuale
      .map(line => line.trim());

    res.json({ formats });
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
