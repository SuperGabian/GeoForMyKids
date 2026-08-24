from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def create_icon(size: int) -> Image.Image:
    scale = size / 512
    image = Image.new("RGB", (size, size), "#eef8f6")
    draw = ImageDraw.Draw(image)
    inset = round(58 * scale)
    bounds = (inset, inset, size - inset, size - inset)
    draw.ellipse(bounds, fill="#137b72")

    line_width = max(2, round(8 * scale))
    globe_line = "#91d2c3"
    draw.ellipse((round(90 * scale), round(198 * scale), round(422 * scale), round(314 * scale)), outline=globe_line, width=line_width)
    draw.ellipse((round(197 * scale), round(74 * scale), round(315 * scale), round(438 * scale)), outline=globe_line, width=line_width)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", round(190 * scale))
    except OSError:
        font = ImageFont.load_default()
    text = "G"
    text_box = draw.textbbox((0, 0), text, font=font)
    x = (size - (text_box[2] - text_box[0])) / 2
    y = (size - (text_box[3] - text_box[1])) / 2 - text_box[1] - round(4 * scale)
    draw.text((x, y), text, font=font, fill="white")
    return image


for icon_size in (180, 192, 512):
    create_icon(icon_size).save(OUTPUT_DIR / f"geofmykids-{icon_size}.png", optimize=True)
