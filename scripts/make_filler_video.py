"""Generate the FILLER video clip and its poster frame for filler-alpha.

The clip is the grainy orb from the filler art, its light slowly rising and
falling. The poster is the clip's first frame, so nothing jumps when it plays.
Replace both with Louisa's real clip and a frame from it.
Run from site/:  python scripts/make_filler_video.py

Encoding needs an ffmpeg with VP8 (libvpx). When ffmpeg is not on PATH, the
copy Playwright installs for its screen recordings is used
(npx playwright install ffmpeg).
"""
import math
import os
import shutil
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops

from make_filler_art import PROJECTS, ROOT, orb_mask

SIZE = (1920, 1080)
FPS = 24
SECONDS = 6
DARK, LIGHT = (16, 16, 16), (232, 232, 230)


def find_ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    cache = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".cache")) / "ms-playwright"
    for exe in sorted(cache.glob("ffmpeg-*/ffmpeg*"), reverse=True):
        return str(exe)
    sys.exit("ffmpeg not found. Install it, or run: npx playwright install ffmpeg")


def frames():
    # The grain stays put while the light breathes, so only the orb's edge
    # changes from frame to frame and the clip stays small.
    mask = orb_mask(SIZE, (0.62, 0.5), 0.38, 56)
    dots = Image.effect_noise(SIZE, 70)
    grain = Image.effect_noise(SIZE, 40).convert("RGB")
    light, dark = Image.new("RGB", SIZE, LIGHT), Image.new("RGB", SIZE, DARK)
    total = FPS * SECONDS
    for i in range(total):
        level = 0.9 + 0.1 * math.cos(2 * math.pi * i / total)
        lit = mask.point(lambda v: int(v * level))
        stippled = ImageChops.add(lit, dots, scale=1.0, offset=-128).point(lambda v: 255 if v > 128 else 0)
        yield Image.blend(Image.composite(light, dark, stippled), grain, 0.07)


if __name__ == "__main__":
    out = PROJECTS / "filler-alpha"
    clip, poster = out / "video.webm", out / "video-poster.jpg"
    cmd = [
        find_ffmpeg(), "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "pipe:0",
        "-an", "-c:v", "libvpx", "-b:v", "2M", "-crf", "10", "-qmin", "0", "-qmax", "42",
        "-deadline", "good", "-cpu-used", "1", "-pix_fmt", "yuv420p", str(clip),
    ]
    with subprocess.Popen(cmd, stdin=subprocess.PIPE) as ffmpeg:
        for i, frame in enumerate(frames()):
            if i == 0:
                frame.save(poster, quality=88, optimize=True)
                print(f"wrote {poster.relative_to(ROOT)}")
            buffer = BytesIO()
            frame.save(buffer, "JPEG", quality=95)
            ffmpeg.stdin.write(buffer.getvalue())
        ffmpeg.stdin.close()
    if ffmpeg.returncode:
        sys.exit(f"ffmpeg failed with exit code {ffmpeg.returncode}")
    print(f"wrote {clip.relative_to(ROOT)} ({clip.stat().st_size / 1e6:.2f} MB)")
