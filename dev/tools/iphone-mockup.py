"""Drop a screenshot into an iPhone 15 Pro frame.

Everything is measured in device points and scaled by SCALE at the end, so the proportions hold
whatever resolution is asked for.

The screenshot comes from the web export, which has no safe area, so its content starts at pixel
zero. The frame supplies what the device would have supplied: a status bar band and a home
indicator, both painted in the app's own background so the seam does not show.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SCALE = 3
SCREEN_W, SCREEN_H = 393, 852       # iPhone 15 Pro logical points
BEZEL, RIM, SCREEN_R = 10, 3, 55
ISLAND_W, ISLAND_H, ISLAND_TOP = 125, 36, 11
STATUS_H, HOME_H = 59, 34
STATUS_MID = 34          # where the clock and the glyphs centre, measured from the top of the screen
MARGIN = 40
SHADOW_BLUR, SHADOW_DY, SHADOW_ALPHA = 26, 14, 80
INK = (17, 17, 19)                  # gray 12, the status bar's own ink

def px(v):
    return int(round(v * SCALE))

def sf(size, weight='Bold'):
    """San Francisco at a named weight.

    SFNS.ttf is a variable font, so asking for it by filename alone gets Regular — which is
    lighter than the status bar has ever been. The named instance has to be selected explicitly.
    """
    try:
        font = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', px(size))
        font.set_variation_by_name(weight)
        return font
    except Exception:
        try:
            return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', px(size))
        except OSError:
            return ImageFont.load_default()

def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m

def status_bar(draw, x, y, w):
    """9:41 on the left, the usual three glyphs on the right. Drawn, not pasted.

    Both groups are centred in the space the Dynamic Island leaves them rather than pushed out to
    the margins. The island is the fixed thing on this row; the clock and the glyphs are what is
    left over on either side of it, and centring each in its own gap is what makes the three read
    as one arrangement instead of two items shoved into corners.

    The centre line sits a little below the island's own. They read as one row, but the island is
    a solid black slab and type levelled exactly with its middle looks like it is rising out of it.
    """
    mid = y + px(STATUS_MID)
    base = mid + px(5)

    island_left = (w - px(ISLAND_W)) / 2
    island_right = island_left + px(ISLAND_W)

    draw.text((x + island_left / 2, mid), '9:41', font=sf(17), fill=INK, anchor='mm')

    # The right-hand glyphs are laid out left to right from one origin, so the group can be
    # centred as a whole: measuring it after the fact would mean drawing it twice.
    bar_w, bar_step = px(3.8), px(5)
    bars_w = bar_step * 3 + bar_w
    wifi_r, gap = px(11), px(6)
    wifi_w = wifi_r * 2
    batt_w, batt_h = px(25), px(12)
    batt_total = batt_w + px(3)

    group_w = bars_w + gap + wifi_w + gap + batt_total
    ox = x + island_right + (w - island_right - group_w) / 2

    # Cellular: four bars climbing.
    for i in range(4):
        h = px(4 + i * 2.6)
        left = ox + i * bar_step
        draw.rounded_rectangle([left, base - h, left + bar_w, base], px(1), fill=INK)

    # Wi-Fi: two arcs and a dot, on the same baseline as the bars.
    cx = ox + bars_w + gap + wifi_r
    for r in (wifi_r, px(7)):
        draw.arc([cx - r, base - r, cx + r, base + r], 218, 322, fill=INK, width=px(3.2))
    draw.ellipse([cx - px(2.2), base - px(2.2), cx + px(2.2), base + px(2.2)], fill=INK)

    # Battery: a rounded shell, a nub, and a fill that stops short of full.
    bx = ox + bars_w + gap + wifi_w + gap
    by = mid - batt_h // 2
    draw.rounded_rectangle([bx, by, bx + batt_w, by + batt_h], px(3.5),
                           outline=INK + (130,), width=max(1, px(1.4)))
    draw.rounded_rectangle([bx + px(2), by + px(2), bx + batt_w - px(4), by + batt_h - px(2)],
                           px(1.5), fill=INK)
    draw.rounded_rectangle([bx + batt_w + px(1.5), by + px(4), bx + batt_w + px(3), by + batt_h - px(4)],
                           px(1), fill=INK + (130,))

def trim_border(shot):
    """Shave the capture's own frame off the screenshot.

    A browser screenshot of a phone viewport comes with a couple of dark pixels around the edge —
    the capture tool's border, not the app. Left on, it draws a hairline box inside the phone's
    display, and it also defeats every later test for "is this row empty", since every row would
    contain those dark pixels.
    """
    a = np.asarray(shot.convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    dark = lambda strip: strip.mean() < 110

    top = 0
    while top < h // 4 and dark(a[top]):
        top += 1
    bottom = h
    while bottom > 3 * h // 4 and dark(a[bottom - 1]):
        bottom -= 1
    left = 0
    while left < w // 4 and dark(a[:, left]):
        left += 1
    right = w
    while right > 3 * w // 4 and dark(a[:, right - 1]):
        right -= 1
    return shot.crop((left, top, right, bottom))


def clean_edges(shot, bg, ring=14, dark=140):
    """Paint out what the capture's rounded corners leave behind.

    `trim_border` can only remove whole rows and columns, so a capture with rounded corners keeps
    four dark arcs just inside the crop — and inside a phone frame those read as chips knocked out
    of the display. Any dark pixel in the outermost ring is one of them: the app's own content
    never reaches the edge, since every screen carries a 16pt gutter.
    """
    a = np.asarray(shot.convert('RGB')).copy()
    h, w, _ = a.shape
    ring = min(ring, h // 4, w // 4)
    for ys, xs in ((slice(0, ring), slice(None)), (slice(h - ring, h), slice(None)),
                   (slice(None), slice(0, ring)), (slice(None), slice(w - ring, w))):
        band = a[ys, xs]
        band[band.max(axis=2) < dark] = bg
        a[ys, xs] = band
    return Image.fromarray(a)


def squeeze_blank(shot, bg, rows):
    """Take `rows` of height out of the screenshot's emptiest band.

    A tall screenshot has to lose height somewhere. Cropping the bottom would take the tab bar and
    cropping the top would take the title, so it comes out of the run of untouched background
    between the last card and the bar — where removing pixels is invisible, because every row in
    that run is identical to the one above it.
    """
    a = np.asarray(shot.convert('RGB')).astype(np.int16)
    flat = (np.abs(a - np.array(bg, dtype=np.int16)).max(axis=(1, 2)) <= 4)

    best_start = best_len = 0
    run_start = None
    for y, blank in enumerate(flat):
        if blank and run_start is None:
            run_start = y
        elif not blank and run_start is not None:
            if y - run_start > best_len:
                best_start, best_len = run_start, y - run_start
            run_start = None
    if run_start is not None and len(flat) - run_start > best_len:
        best_start, best_len = run_start, len(flat) - run_start

    take = min(rows, max(0, best_len - 1))
    if take <= 0:
        return shot.crop((0, 0, shot.width, shot.height - rows))

    out = Image.new('RGB', (shot.width, shot.height - take))
    out.paste(shot.crop((0, 0, shot.width, best_start)), (0, 0))
    out.paste(shot.crop((0, best_start + take, shot.width, shot.height)), (0, best_start))
    if take < rows:
        out = out.crop((0, 0, out.width, out.height - (rows - take)))
    return out


def build(src_path, out_path):
    shot = trim_border(Image.open(src_path).convert('RGB'))
    # The app background, taken as the screenshot's most common colour rather than a corner pixel:
    # a browser screenshot rounds its own corners, so the corner is a dark artefact of the capture.
    px_all = np.asarray(shot).reshape(-1, 3)
    cols, counts = np.unique(px_all, axis=0, return_counts=True)
    bg = tuple(int(v) for v in cols[counts.argmax()])

    screen = (px(SCREEN_W), px(SCREEN_H))
    body_r, rim_r = px(SCREEN_R + BEZEL), px(SCREEN_R + BEZEL + RIM)
    body = (px(SCREEN_W + 2 * BEZEL), px(SCREEN_H + 2 * BEZEL))
    rim = (px(SCREEN_W + 2 * (BEZEL + RIM)), px(SCREEN_H + 2 * (BEZEL + RIM)))

    canvas = Image.new('RGBA', (rim[0] + px(2 * MARGIN), rim[1] + px(2 * MARGIN)), (0, 0, 0, 0))
    ox, oy = px(MARGIN), px(MARGIN)

    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [ox, oy + px(SHADOW_DY), ox + rim[0], oy + rim[1] + px(SHADOW_DY)],
        rim_r, fill=(0, 0, 0, SHADOW_ALPHA))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(px(SHADOW_BLUR))))

    # Titanium rim: a vertical ramp, so the edge catches light differently top to bottom.
    rim_img = Image.new('RGBA', rim, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim_img)
    for y in range(rim[1]):
        v = int(150 - 60 * (y / rim[1]))
        rd.line([(0, y), (rim[0], y)], fill=(v, v - 4, v - 10, 255))
    rim_img.putalpha(rounded_mask(rim, rim_r))
    canvas.alpha_composite(rim_img, (ox, oy))

    body_img = Image.new('RGBA', body, (16, 16, 18, 255))
    body_img.putalpha(rounded_mask(body, body_r))
    canvas.alpha_composite(body_img, (ox + px(RIM), oy + px(RIM)))

    # The display: the screenshot fills the full width, which means its height has to be made to
    # fit rather than scaled to fit — scaling it down would leave bands at the sides, and a phone
    # mockup with margins inside the screen reads as a picture of a browser.
    display = Image.new('RGBA', screen, bg + (255,))
    # Only the status bar takes height from the screenshot. The home indicator floats over the
    # bottom of it the way it does over a real app, so reserving space for it too would push the
    # tab bar up and leave a white strip under it.
    inner_h = screen[1] - px(STATUS_H)
    shot = clean_edges(shot, bg)
    ratio = screen[0] / shot.width
    overflow = int(round((shot.height * ratio - inner_h) / ratio))
    if overflow > 0:
        shot = squeeze_blank(shot, bg, overflow)
    fitted = shot.resize((screen[0], int(shot.height * ratio + 0.5)), Image.LANCZOS)
    display.paste(fitted, (0, px(STATUS_H)))

    dd = ImageDraw.Draw(display, 'RGBA')
    status_bar(dd, 0, 0, screen[0])
    hw = px(140)
    dd.rounded_rectangle(
        [(screen[0] - hw) // 2, screen[1] - px(10), (screen[0] + hw) // 2, screen[1] - px(5)],
        px(2.5), fill=INK + (190,))

    display.putalpha(rounded_mask(screen, px(SCREEN_R)))
    canvas.alpha_composite(display, (ox + px(RIM + BEZEL), oy + px(RIM + BEZEL)))

    island = Image.new('RGBA', (px(ISLAND_W), px(ISLAND_H)), (0, 0, 0, 255))
    island.putalpha(rounded_mask(island.size, px(ISLAND_H / 2)))
    canvas.alpha_composite(
        island,
        (ox + px(RIM + BEZEL) + (screen[0] - px(ISLAND_W)) // 2, oy + px(RIM + BEZEL + ISLAND_TOP)))

    canvas.save(out_path)
    print('wrote', out_path, canvas.size)

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
