"""Generate grainy black-and-white filler images for FILLER content.

Replace these with Louisa's real project images as they arrive.
Run from site/:  python scripts/make_filler_art.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src" / "content" / "projects"
ASSETS = ROOT / "src" / "assets"

INK = (18, 18, 18)
PAPER = (240, 240, 239)
MID = (120, 120, 118)


def stipple(mask: Image.Image, strength: int = 70) -> Image.Image:
    """Turn a soft greyscale mask into a grainy, dithered one (the Alta grain look)."""
    noise = Image.effect_noise(mask.size, strength)
    return ImageChops.add(mask, noise, scale=1.0, offset=-128).point(lambda v: 255 if v > 128 else 0)


def fine_grain(img: Image.Image, amount: float = 0.07) -> Image.Image:
    noise = Image.effect_noise(img.size, 40).convert("RGB")
    return Image.blend(img, noise, amount)


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def orb_mask(size, centre, radius, blur):
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    cx, cy = centre[0] * w, centre[1] * h
    r = radius * min(w, h)
    # Brighter towards the upper left, so the sphere reads as lit.
    for i in range(24, 0, -1):
        t = i / 24
        rr = r * t
        ox, oy = (1 - t) * -0.35 * r, (1 - t) * -0.35 * r
        d.ellipse([cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr], fill=int(255 * (1 - t) ** 0.6 + 40))
    return mask.filter(ImageFilter.GaussianBlur(blur))


def orb(size, bg, fg, centre, radius, blur, strength=70):
    mask = orb_mask(size, centre, radius, blur)
    img = Image.composite(Image.new("RGB", size, fg), Image.new("RGB", size, bg), stipple(mask, strength))
    return fine_grain(img)


def wave(size, bg, fg, crest=0.45, blur=90, strength=80):
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    points = [(0, h)]
    for x in range(0, w + 1, 8):
        t = x / w
        y = h * (crest + 0.18 * __import__("math").sin(t * 5.2 + 0.6) - 0.10 * t)
        points.append((x, y))
    points.append((w, h))
    d.polygon(points, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur))
    img = Image.composite(Image.new("RGB", size, fg), Image.new("RGB", size, bg), stipple(mask, strength))
    return fine_grain(img)


def screens(size, bg, count=3, dark=False, seed=0):
    w, h = size
    img = Image.new("RGB", size, bg)
    card_bg = (28, 28, 28) if dark else (252, 252, 251)
    bar = (70, 70, 70) if dark else (214, 214, 212)
    accent = (235, 235, 233) if dark else (24, 24, 24)
    cw, ch = int(w * 0.24), int(h * 0.74)
    gap = int(w * 0.05)
    total = count * cw + (count - 1) * gap
    x0, y0 = (w - total) // 2, (h - ch) // 2
    for i in range(count):
        x = x0 + i * (cw + gap)
        y = y0 + (i % 2) * int(h * 0.06) - int(h * 0.03)
        # Soft shadow, then the card.
        shadow = Image.new("L", size, 0)
        ImageDraw.Draw(shadow).rounded_rectangle([x + 10, y + 26, x + cw + 10, y + ch + 26], radius=48, fill=120 if dark else 70)
        img = Image.composite(Image.new("RGB", size, (0, 0, 0)), img, shadow.filter(ImageFilter.GaussianBlur(34)))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=44, fill=card_bg)
        pad = int(cw * 0.1)
        d.ellipse([x + pad, y + pad, x + pad + int(cw * 0.16), y + pad + int(cw * 0.16)], fill=accent)
        by = y + pad + int(cw * 0.26)
        for j in range(7):
            length = cw - 2 * pad - ((j * 37 + seed * 13 + i * 29) % int(cw * 0.45))
            d.rounded_rectangle([x + pad, by, x + pad + length, by + int(ch * 0.022)], radius=8, fill=bar)
            by += int(ch * 0.055)
        d.rounded_rectangle([x + pad, y + ch - pad - int(ch * 0.07), x + cw - pad, y + ch - pad], radius=40, fill=accent)
    return fine_grain(img, 0.05)


def diagram(size, bg, labels):
    w, h = size
    img = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(img)
    n = len(labels)
    r = int(min(w, h) * 0.11)
    xs = [int(w * (i + 1) / (n + 1)) for i in range(n)]
    ys = [int(h * (0.42 if i % 2 == 0 else 0.58)) for i in range(n)]
    for i in range(n - 1):
        # Run each connector from circle edge to circle edge, with the arrowhead along the line.
        dx, dy = xs[i + 1] - xs[i], ys[i + 1] - ys[i]
        length = (dx * dx + dy * dy) ** 0.5
        ux, uy = dx / length, dy / length
        sx, sy = xs[i] + ux * r, ys[i] + uy * r
        ex, ey = xs[i + 1] - ux * (r + 8), ys[i + 1] - uy * (r + 8)
        d.line([sx, sy, ex - ux * 30, ey - uy * 30], fill=MID, width=6)
        d.polygon([(ex, ey), (ex - ux * 36 - uy * 17, ey - uy * 36 + ux * 17),
                   (ex - ux * 36 + uy * 17, ey - uy * 36 - ux * 17)], fill=MID)
    f = font(int(r * 0.34))
    for i, label in enumerate(labels):
        d.ellipse([xs[i] - r, ys[i] - r, xs[i] + r, ys[i] + r], outline=INK, width=6, fill=(250, 250, 249))
        d.text((xs[i], ys[i]), label, fill=INK, font=f, anchor="mm")
        d.text((xs[i], ys[i] + r + 44), f"0{i + 1}", fill=MID, font=font(int(r * 0.26)), anchor="mm")
    return fine_grain(img, 0.04)


def portrait(size, bg, fg):
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([w * 0.31, h * 0.16, w * 0.69, h * 0.52], fill=255)          # head
    d.rounded_rectangle([w * 0.12, h * 0.56, w * 0.88, h * 1.25], radius=int(w * 0.3), fill=255)  # shoulders
    mask = mask.filter(ImageFilter.GaussianBlur(28))
    img = Image.composite(Image.new("RGB", size, fg), Image.new("RGB", size, bg), stipple(mask, 60))
    return fine_grain(img)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=88, optimize=True)
    print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    a, b = PROJECTS / "filler-alpha", PROJECTS / "filler-beta"
    save(screens((2400, 1800), (22, 22, 22), dark=True, seed=1), a / "cover.jpg")
    save(orb((2400, 1800), (236, 236, 235), (20, 20, 20), (0.5, 0.56), 0.34, 60), b / "cover.jpg")
    save(wave((2400, 1500), PAPER, INK, crest=0.5), a / "context.jpg")
    save(diagram((2400, 1350), (244, 244, 243), ["Lorem", "Ipsum", "Dolor", "Amet"]), a / "diagram.jpg")
    save(screens((1600, 1200), (226, 226, 224), count=2, seed=2), a / "iteration-1.jpg")
    save(screens((1600, 1200), (30, 30, 30), count=2, dark=True, seed=3), a / "iteration-2.jpg")
    save(screens((2400, 1500), (238, 238, 237), count=3, seed=4), a / "final.jpg")
    # filler-alpha/video-poster.jpg is the first frame of the filler clip: scripts/make_filler_video.py
    save(portrait((1600, 2000), (232, 232, 231), (24, 24, 24)), ASSETS / "portrait.jpg")
