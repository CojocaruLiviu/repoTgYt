#!/bin/bash

mkdir -p bin
cd bin

# yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod +x yt-dlp

# ffmpeg + ffprobe static
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-*-static/ffmpeg ffmpeg
mv ffmpeg-*-static/ffprobe ffprobe
chmod +x ffmpeg ffprobe

# cleanup
rm -rf ffmpeg.tar.xz ffmpeg-*-static
