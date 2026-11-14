"""Renders one 1920x1080 event banner per entry in events.json.

Run: python make_banners.py
Output: <id>.png next to this script.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 1920, 1080
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT = "C:/Windows/Fonts/arial.ttf"


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def gradient(c1, c2):
    img = Image.new("RGB", (W, H), c1)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        color = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        draw.line([(0, y), (W, y)], fill=color)
    return img


def wrap(draw, text, font, max_width):
    words, lines, line = text.split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def render(event):
    c1, c2 = (hex_to_rgb(c) for c in event["color"])
    img = gradient(c1, c2)
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(FONT_BOLD, 120)
    sub_font = ImageFont.truetype(FONT, 56)
    tr_font = ImageFont.truetype(FONT, 46)
    small_font = ImageFont.truetype(FONT_BOLD, 40)

    margin = 140
    y = 260
    for line in wrap(draw, event["en"]["title"], title_font, W - 2 * margin):
        draw.text((margin, y), line, font=title_font, fill="white")
        y += 140
    y += 20
    for line in wrap(draw, event["en"]["subtitle"], sub_font, W - 2 * margin):
        draw.text((margin, y), line, font=sub_font, fill=(235, 245, 240))
        y += 72
    y += 60
    draw.text((margin, y), event["tr"]["title"], font=tr_font, fill="white")
    y += 62
    draw.text((margin, y), event["tr"]["subtitle"], font=tr_font, fill=(220, 235, 228))

    footer = f"Vera  •  {event['start']} → {event['end']}"
    draw.text((margin, H - 150), footer, font=small_font, fill=(240, 240, 240))
    return img


def main():
    data = json.loads((HERE / "events.json").read_text(encoding="utf-8"))
    for event in data["events"]:
        out = HERE / f"{event['id']}.png"
        render(event).save(out, "PNG")
        print(out.name)


if __name__ == "__main__":
    main()
