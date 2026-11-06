"""Portuguese letters for structs-webapp's pixel fonts.

DirectiveZero and ExtremeHazard hold ASCII and nothing else, so a browser
would set every ã, ç and é in a system font, in the middle of a pixel word.
This draws what Portuguese needs on each font's own pixel grid: the upstream
letter's outline with an accent made of pixels. The result is a small font
holding only the new characters, which ptbr/public/ptbr/ptbr.css adds to each
family as a second face with a unicode-range, so everything else still comes
from webapp's own files.

fonts.json records the upstream fonts these were drawn from; ptbr/audit.cjs
reports them as stale if upstream changes a font.

    python3 -m pip install fonttools brotli
    python3 ptbr/art/fonts.py
"""
import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
UPSTREAM = ROOT / "structs-webapp/src/public/fonts/sui"
OUT = ROOT / "ptbr/public/ptbr/fonts"
RECORD = Path(__file__).with_name("fonts.json")

GRID = 125  # both fonts are drawn on 125-unit pixels

ACCENTS = {
    "acute": 0x301, "grave": 0x300, "circumflex": 0x302, "tilde": 0x303, "diaeresis": 0x308,
}
# Each letter is built from one base letter and one mark.
LETTERS = {
    "Á": ("A", "acute"), "À": ("A", "grave"), "Â": ("A", "circumflex"), "Ã": ("A", "tilde"),
    "É": ("E", "acute"), "Ê": ("E", "circumflex"), "Í": ("I", "acute"),
    "Ó": ("O", "acute"), "Ô": ("O", "circumflex"), "Õ": ("O", "tilde"),
    "Ú": ("U", "acute"), "Ü": ("U", "diaeresis"), "Ç": ("C", "cedilla"),
    "á": ("a", "acute"), "à": ("a", "grave"), "â": ("a", "circumflex"), "ã": ("a", "tilde"),
    "é": ("e", "acute"), "ê": ("e", "circumflex"), "í": ("dotless", "acute"),
    "ó": ("o", "acute"), "ô": ("o", "circumflex"), "õ": ("o", "tilde"),
    "ú": ("u", "acute"), "ü": ("u", "diaeresis"), "ç": ("c", "cedilla"),
}

FONTS = {
    "DirectiveZeroWid.ttf": {
        "out": "DirectiveZero-ptbr.woff2",
        # Thin strokes, one pixel.
        "marks": {
            "acute": ["  #", " # "],
            "grave": ["#  ", " # "],
            "circumflex": [" # ", "# #"],
            "tilde": [" # #", "# # "],
            "diaeresis": ["# #"],
            "cedilla": [" # ", "## "],
        },
        "narrow_marks": {"acute": [" #", "# "]},
        "stem": (125, 625),  # the width and height of a dotless i
        "ring": ["###", "# #", "###"],
        "ordinal_a": [" ##", "# #", " ##"],
        "ring_pixel": 1,
        "dash": (250, 375),
        "en": 500,
        "em": 875,
        "dash_side": 125,
    },
    "ExtremeHazard.ttf": {
        "out": "ExtremeHazard-ptbr.woff2",
        # Heavy strokes, two pixels, and no lower case of its own.
        "marks": {
            "acute": ["  ###", "###  "],
            "grave": ["###  ", "  ###"],
            "circumflex": ["  ##  ", "##  ##"],
            "tilde": [" ### ##", "## ### "],
            "diaeresis": ["##  ##", "##  ##"],
            "cedilla": ["  ##  ", " ###  "],
        },
        "narrow_marks": {"acute": [" ##", "## "]},
        "stem": (250, 1000),
        "ring": ["###", "# #", "###"],
        "ordinal_a": [" ##", "# #", " ##"],
        "ring_pixel": 2,
        "dash": (375, 625),
        "en": 875,
        "em": 1250,
        "dash_side": 250,
    },
}


def rectangles(pen, pattern, left, top, pixel=GRID):
    """Draws a pattern; each # is a pixel, `top` is the top edge of its first row."""
    for y, line in enumerate(pattern):
        for x, char in enumerate(line):
            if char == "#":
                x0 = left + x * pixel
                y1 = top - y * pixel
                y0 = y1 - pixel
                # Clockwise, as TrueType fills.
                pen.moveTo((x0, y0))
                pen.lineTo((x0, y1))
                pen.lineTo((x0 + pixel, y1))
                pen.lineTo((x0 + pixel, y0))
                pen.closePath()


def snapped(value):
    return int(value // GRID) * GRID


def build(source, settings):
    font = TTFont(source)
    glyf, hmtx, cmap = font["glyf"], font["hmtx"], font.getBestCmap()
    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()
    added = {}

    def add(char, name, glyph, advance):
        order.append(name)
        glyf[name] = glyph
        hmtx[name] = (advance, 0)
        added[ord(char)] = name

    def outline(pen, base):
        glyph_set[cmap[ord(base)]].draw(pen)

    for char, (base, mark) in LETTERS.items():
        pen = TTGlyphPen(glyph_set)
        if base == "dotless":
            width, height = settings["stem"]
            pen.moveTo((0, 0))
            pen.lineTo((0, height))
            pen.lineTo((width, height))
            pen.lineTo((width, 0))
            pen.closePath()
            advance = hmtx[cmap[ord("i")]][0]
            top = height
        else:
            outline(pen, base)
            glyph = glyf[cmap[ord(base)]]
            width, top = glyph.xMax, glyph.yMax
            advance = hmtx[cmap[ord(base)]][0]
        slim = base in ("I", "dotless")
        pattern = (settings["narrow_marks"] if slim else settings["marks"])[mark]
        mark_width = len(pattern[0]) * GRID
        left = snapped(max(0, (width - mark_width) / 2 + GRID / 2))
        # Above with a clear row between, or below the baseline for the cedilla.
        rectangles(pen, pattern, left, 0 if mark == "cedilla" else top + GRID + len(pattern) * GRID)
        side = advance - width
        name = f"ptbr{ord(char):04X}"
        add(char, name, pen.glyph(), max(advance, left + mark_width + side))

    # Curly quotes take the shape of the straight ones, as in the banner of each font.
    for char, base in {"‘": "'", "’": "'", "“": '"', "”": '"'}.items():
        pen = TTGlyphPen(glyph_set)
        outline(pen, base)
        add(char, f"ptbr{ord(char):04X}", pen.glyph(), hmtx[cmap[ord(base)]][0])

    bottom, top = settings["dash"]
    for char, width in (("–", settings["en"]), ("—", settings["em"])):
        pen = TTGlyphPen(glyph_set)
        pen.moveTo((0, bottom))
        pen.lineTo((0, top))
        pen.lineTo((width, top))
        pen.lineTo((width, bottom))
        pen.closePath()
        add(char, f"ptbr{ord(char):04X}", pen.glyph(), width + settings["dash_side"])

    # Three periods.
    period = cmap[ord(".")]
    step = hmtx[period][0]
    pen = TTGlyphPen(glyph_set)
    for index in range(3):
        glyph_set[period].draw(TransformPen(pen, (1, 0, 0, 1, index * step, 0)))
    add("…", "ptbr2026", pen.glyph(), step * 3)

    pixel = settings["ring_pixel"] * GRID
    capital = glyf[cmap[ord("A")]].yMax
    for char, pattern in (("º", settings["ring"]), ("°", settings["ring"]), ("ª", settings["ordinal_a"])):
        pen = TTGlyphPen(glyph_set)
        rectangles(pen, pattern, 0, capital, pixel)
        add(char, f"ptbr{ord(char):04X}", pen.glyph(), 3 * pixel + settings["dash_side"])

    font.setGlyphOrder(order)
    font["maxp"].numGlyphs = len(order)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(added)

    options = subset.Options()
    options.notdef_outline = True
    options.name_IDs = ["*"]
    options.glyph_names = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=list(added))
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(OUT / settings["out"])
    return len(added)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    record = {}
    for name, settings in FONTS.items():
        source = UPSTREAM / name
        count = build(source, settings)
        record[f"public/fonts/sui/{name}"] = hashlib.sha256(source.read_bytes()).hexdigest()
        print(f"{settings['out']}: {count} characters")
    RECORD.write_text(json.dumps(record, indent=2) + "\n")


if __name__ == "__main__":
    main()
