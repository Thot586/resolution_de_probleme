"""Regenerate the embedded heading font (assets/fonts/BarlowCondensed-Bold.subset.woff2).

Why: the heading font used to be a separate 110 KB TTF loaded with font-display: swap, which made the headings
flash from a fallback font to Barlow Condensed at load. The build now embeds a small WOFF2 subset directly in
index.html (no second request, no external dependency). Barlow is under the SIL Open Font License 1.1
(assets/fonts/OFL.txt); a subset is a modified version and keeps the same license.

Usage (needs fontTools and brotli: pip install fonttools brotli):
    python scripts/subset-font.py
Then run: npm run build
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "fonts", "BarlowCondensed-Bold.ttf")
TARGET = os.path.join(ROOT, "assets", "fonts", "BarlowCondensed-Bold.subset.woff2")

# Characters actually written in the app (pages, scripts, template) ...
used = set()
for pattern in ("pages/*.html", "scripts/*.js", "index.template.html"):
    for path in glob.glob(os.path.join(ROOT, pattern)):
        with open(path, encoding="utf-8") as handle:
            used.update(handle.read())
# ... plus a safety margin so text typed by a person in a heading-styled place never falls back:
# Basic Latin, Latin-1 Supplement, Latin Extended-A, general punctuation, euro sign.
margin = set()
for start, end in ((0x20, 0x7E), (0xA0, 0x17F), (0x2010, 0x2027), (0x2030, 0x203A), (0x20AC, 0x20AC), (0x2122, 0x2122)):
    margin.update(chr(code) for code in range(start, end + 1))
wanted = {ord(char) for char in (used | margin) if char >= " " and char != "\x7f"}

font = TTFont(SOURCE)
available = set(font.getBestCmap())
unicodes = sorted(wanted & available)

options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["kern", "liga", "ccmp", "locl", "mark", "mkmk", "calt"]
options.hinting = False
options.desubroutinize = True
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright and license notices
options.notdef_outline = True
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)
subset.save_font(font, TARGET, options)

print(f"{len(unicodes)} characters kept; {os.path.getsize(SOURCE)} B (TTF) -> {os.path.getsize(TARGET)} B (WOFF2)")
missing = sorted(char for char in used if ord(char) >= 0x20 and ord(char) not in available and char not in "\t\n\r\x7f")
if missing:
    print("used in the app but absent from the font (they use the fallback font):", " ".join(f"U+{ord(char):04X}" for char in missing)[:400])
sys.exit(0)
