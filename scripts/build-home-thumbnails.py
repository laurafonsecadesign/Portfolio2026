#!/usr/bin/env python3
"""Build small WebP previews for homepage effects without changing gallery originals."""
import re
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "assets" / "images"
OUT = IMAGES / "hero-thumbs"
MAX_WIDTH = 560
MAX_HEIGHT = 920
QUALITY = 74
created = []

def thumbnail_for(url: str) -> str:
    prefix = "../" if url.startswith("../") else ""
    path = url.removeprefix("../")
    if path.startswith("assets/images/hero-thumbs/"):
        return url
    if not path.startswith("assets/images/") or not path.endswith(".webp"):
        raise ValueError(f"Unexpected home image source: {url}")
    original = ROOT / path
    if not original.is_file():
        raise FileNotFoundError(original)
    result = OUT / Path(path).relative_to("assets/images")
    result.parent.mkdir(parents=True, exist_ok=True)
    if not result.is_file():
        with Image.open(original) as source:
            frame = ImageOps.exif_transpose(source.convert("RGBA" if "A" in source.getbands() else "RGB"))
            frame.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.Resampling.LANCZOS)
            frame.save(result, format="WEBP", quality=QUALITY, method=6)
        created.append((result.relative_to(ROOT), original.stat().st_size, result.stat().st_size))
    return prefix + result.relative_to(ROOT).as_posix()

for lang in ("index.html", "es/index.html"):
    path = ROOT / lang
    html = path.read_text(encoding="utf-8")
    pattern = r'(<div class="(?:mobile-hero__reel|image-trail)"[^>]*\bdata-images=")([^"]+)(")'
    def replace_data_images(match):
        return match.group(1) + "|".join(map(thumbnail_for, match.group(2).split("|"))) + match.group(3)
    html, count = re.subn(pattern, replace_data_images, html)
    assert count == 2, f"Expected both effects in {lang}, got {count}"
    html, initial = re.subn(
        r'(<img class="mobile-hero__slide is-active" src=")([^"]+)(")',
        lambda m: m.group(1) + thumbnail_for(m.group(2)) + m.group(3),
        html,
    )
    assert initial == 1, f"Missing initial mobile slide in {lang}"
    path.write_text(html, encoding="utf-8")

before = sum(x[1] for x in created)
after = sum(x[2] for x in created)
print(f"Created {len(created)} WebP previews: {before/1024/1024:.2f} MiB => {after/1024/1024:.2f} MiB")
for path, old, new in created:
    print(f"{path}  {old // 1024} -> {new // 1024} KiB")
