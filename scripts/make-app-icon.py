"""Curio 앱 아이콘 생성기.

레퍼런스로 받은 로고 이미지는 스크린샷이라 가장자리가 계단지고 흰 여백이 붙어 있다.
같은 그림을 벡터 폰트에서 다시 그린다 — 모서리 라운드는 넣지 않는다. iOS/안드로이드가
아이콘을 자기 마스크로 깎기 때문에, 원본에 라운드가 있으면 두 번 깎여 모서리가 뜬다.

폰트는 `theme/typography.ts` 의 `wordmark` 와 같은 Jost 다. 아이콘과 로그인 화면이 서로
다른 글자꼴로 같은 이름을 쓰면 그건 로고가 두 개인 것이므로, 한쪽을 바꾸면 여기도 바꾼다.
다만 무게는 한 단 올린 400 이다 — 300 의 획은 홈 화면 크기에서 사라진다.
"""
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets/images"
FONT = ROOT / "node_modules/@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf"
PREVIEW = Path(tempfile.gettempdir()) / "curio-icon-preview.png"

INK = (0, 0, 0, 255)          # 로고의 검정. 토큰이 아니라 브랜드 자산이라 여기 산다.
PAPER = (255, 255, 255, 255)
TEXT = "CURIO"
TRACKING = 0.30               # em. 레퍼런스의 벌어진 자간.


def wordmark(px=1200, fill=PAPER):
    """자간을 준 CURIO 를 투명 배경에 그리고 알파 기준으로 딱 맞게 잘라 돌려준다."""
    font = ImageFont.truetype(str(FONT), px)
    track = int(px * TRACKING)
    widths = [font.getlength(c) for c in TEXT]
    total = int(sum(widths) + track * (len(TEXT) - 1))
    canvas = Image.new("RGBA", (total + px, px * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    x = px // 2
    for c, w in zip(TEXT, widths):
        d.text((x, px), c, font=font, fill=fill, anchor="ls")
        x += w + track
    return canvas.crop(canvas.getbbox())


def place(canvas_size, ratio, bg=None, fill=PAPER):
    """정사각 캔버스 가운데에 워드마크를 캔버스 폭의 `ratio` 만큼 얹는다."""
    w = h = canvas_size
    img = Image.new("RGBA", (w, h), bg if bg else (0, 0, 0, 0))
    mark = wordmark(fill=fill)
    tw = int(w * ratio)
    th = max(1, round(mark.height * tw / mark.width))
    mark = mark.resize((tw, th), Image.LANCZOS)
    img.alpha_composite(mark, ((w - tw) // 2, (h - th) // 2))
    return img


def save(img, name, mode="RGBA"):
    img.convert(mode).save(IMG / name)
    print(f"{name:34} {img.width}x{img.height}")


# iOS/공통 아이콘 — 전면 검정. 라운드는 OS 가 씌운다.
save(place(1024, 0.62, bg=INK), "icon.png", "RGB")

# 안드로이드 어댑티브 — 전경은 66% 안전 영역 안에 들어와야 잘리지 않는다.
save(place(512, 0.54), "android-icon-foreground.png")
save(Image.new("RGBA", (512, 512), INK), "android-icon-background.png", "RGB")
save(place(432, 0.54), "android-icon-monochrome.png")

# 스플래시 — 검정 배경 위 흰 워드마크. 배경은 app.config.js 가 칠한다.
save(place(1024, 0.86), "splash-icon.png")

# 파비콘 — 48px 에서 CURIO 다섯 글자는 뭉개진다. 64 로 올리고 폭을 꽉 채운다.
save(place(64, 0.78, bg=INK), "favicon.png", "RGB")

# 확인용 시트. 아이콘은 홈 화면에서 작게 보이므로 큰 것만 보고 정하면 자간을 놓친다.
SLOTS = [("icon.png", 320), ("icon.png", 120), ("favicon.png", 64), ("splash-icon.png", 320)]
sheet = Image.new("RGB", (60 * (len(SLOTS) + 1) + sum(s for _, s in SLOTS), 440), (250, 250, 250))
x = 60
for n, s in SLOTS:
    im = Image.open(IMG / n).convert("RGBA").resize((s, s), Image.LANCZOS)
    bg = Image.new("RGBA", (s, s), INK)
    bg.alpha_composite(im)
    sheet.paste(bg.convert("RGB"), (x, (440 - s) // 2))
    x += s + 60
sheet.save(PREVIEW)
print(f"preview  {PREVIEW}")
