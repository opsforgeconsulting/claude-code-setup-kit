#!/usr/bin/env bash
# Encode a scroll-scrub intro film from two generated clips in raw/clips (c1.mp4, c2.mp4).
#   public/media/film.mp4      1280x720, short crossfade, a keyframe every 8 frames so scrubbing seeks cleanly, no audio
#   public/media/film-sm.mp4   854x480 for phones
#   public/media/k1|k2|k3.jpg  keyframe stills shown until the video can seek, and for reduced motion
#
# Before running: set OFFSET to (length of c1 in seconds) minus the crossfade length.
#   ffprobe -v error -show_entries format=duration -of csv=p=0 raw/clips/c1.mp4
# One clip only? Drop the xfade: use -vf "scale=1280:720,setsar=1,fps=30" on c1 alone.
set -euo pipefail
cd "$(dirname "$0")/.."
R=raw/clips; O=public/media
FADE=0.3
OFFSET=${OFFSET:-5.74}
mkdir -p "$O"
XF="[0]scale=1280:720,setsar=1,fps=30[a];[1]scale=1280:720,setsar=1,fps=30[b];[a][b]xfade=transition=fade:duration=${FADE}:offset=${OFFSET}[v]"
ENC="-c:v libx264 -pix_fmt yuv420p -movflags +faststart -an -g 8 -keyint_min 8 -sc_threshold 0 -preset slow"
ffmpeg -y -loglevel error -i $R/c1.mp4 -i $R/c2.mp4 -filter_complex "$XF" -map "[v]" $ENC -crf 26 $O/film.mp4
ffmpeg -y -loglevel error -i $O/film.mp4 -vf scale=854:480 $ENC -crf 28 $O/film-sm.mp4
ffmpeg -y -loglevel error -ss 0 -i $R/c1.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 3 $O/k1.jpg
ffmpeg -y -loglevel error -sseof -0.1 -i $R/c1.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 3 $O/k2.jpg
ffmpeg -y -loglevel error -sseof -0.1 -i $R/c2.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 3 $O/k3.jpg
ls -la $O
