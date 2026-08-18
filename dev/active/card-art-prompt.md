# 카드 아트 생성 프롬프트

카드 앞면에 들어갈 이미지를 만드는 프롬프트다. **제품 사진을 첨부하고** 이 프롬프트를 함께 보낸다.

그림에 들어가는 것은 둘뿐이다 — **그 제품**, 그리고 **그걸 산 도시의 랜드마크**. 계절도 문구도 넣지 않는다. 파리에서 산 가방이면 에펠탑을 등지고 놓인 그 가방이 나온다.

제품 사진은 **참조이지 원본이 아니다.** 각도, 놓인 자세, 빛은 장면에 맞게 다시 연출해도 된다. 바꾸면 안 되는 건 그 물건의 정체성 — 형태, 소재, 색, 금속 장식, 모노그램이다.

프롬프트 본문은 영어다. 화면에 나가는 글자는 전부 한국어라는 규칙(`AGENTS.md`)은 고객이 읽는 말에 대한 것이고, 이건 이미지 모델에게 보내는 지시문이다.

## 채워 넣는 값

| 변수 | 출처 | 예 |
|---|---|---|
| `{brand}` | `card.brand.name` | MCM |
| `{product_name}` | `card.product.name` | Visetos Seoul Exclusive Backpack |
| `{category}` | `card.product.category` | backpack |
| `{city}` | `card.store.city` | Seoul |
| `{landmark}` | 아래 표 | Gyeongbokgung Palace |

### 도시 → 랜드마크

| 도시 | `{landmark}` |
|---|---|
| Seoul | Gyeongbokgung Palace |
| Busan | the Gwangan Bridge |
| Paris | the Eiffel Tower |
| Tokyo | Tokyo Tower |
| New York | the Manhattan skyline |

표에 없는 도시는 `{landmark}` 자리에 `the single most recognisable landmark of {city}`를 그대로 넣는다. 모델이 고르게 두는 편이 엉뚱한 이름을 지어 넣는 것보다 낫다.

## 프롬프트

```
A vertical 3:4 photograph for a collectible card.

SUBJECT — the product in the attached image.
The attached image shows a {category} by {brand}: "{product_name}".
Keep its identity exactly: the same silhouette, material, texture, colour,
hardware, stitching, and any monogram or pattern. Someone who owns this
product must recognise it as theirs.

You may restage it freely to fit the composition — turn it to a different
angle, stand it up, lean it, change the lighting on it, show it three-quarter
or in profile. Reposing it is expected; redesigning it is not.

SCENE — {city}, with {landmark} clearly visible behind it.
The product sits in the foreground, sharp and close. {landmark} rises in the
background, unmistakable and recognisable at a glance, softly out of focus.
Between them, ordinary street level of {city} — paving, a wall, a railing, a
table edge — so the product is resting somewhere real rather than pasted over
a picture of the city. Natural daylight, clear weather.

COMPOSITION.
Vertical 3:4. The product is the hero and fills roughly half the frame height,
placed in the middle third. {landmark} occupies the upper third, complete
enough to be identified. Keep the bottom quarter of the frame calm and
uncluttered — ground, shadow, or soft background only, in mid to deep tones.
Shallow depth of field: the product sharp, everything behind it falling away.

LIGHT AND COLOUR.
Natural daylight. Restrained, editorial colour — the product stays the most
saturated thing in the frame and the city sits half a step back from it. Fine
photographic grain. No HDR, no heavy vignette, no colour filter look.

DO NOT INCLUDE.
No text, lettering, numbers, captions, or watermarks anywhere in the image,
other than markings physically present on the product itself. No logos or
brand marks belonging to anyone but this product. No human faces. No other
handbags, wallets, shoes, or fashion goods beside it. No borders, frames,
collage panels, or drop shadows added around the image. No illustration or
3D-render look — this is a photograph.
```

## 채워 넣은 예 (목데이터 3장)

**MCM · Visetos Seoul Exclusive Backpack** → `{category}` backpack, `{city}` Seoul, `{landmark}` Gyeongbokgung Palace

**MCM · Tracery Card Wallet** → `{category}` card wallet, `{city}` Seoul, `{landmark}` Gyeongbokgung Palace
작은 물건이라 `fills roughly half the frame height`가 과하게 잡힌다. 지갑·카드홀더는 `half` → `a third`로 낮추고 랜드마크를 조금 더 멀리 둔다.

**Atelier Rouge · Soie Carré Scarf** → `{category}` silk scarf, `{city}` Busan, `{landmark}` the Gwangan Bridge

## 카드 앞면과 맞물리는 제약

이 그림은 `src/components/card/card-face.tsx` 위에 깔린다. 이미지 안에 글자는 없지만, **우리 글자가 위에 올라간다.**

- **좌하단** — 브랜드명과 시리얼이 흰 글자로 올라간다. 프롬프트의 `bottom quarter … mid to deep tones`가 이걸 위한 것이다. 밑동이 하얗게 날아간 그림은 글자가 사라진다.
- **우상단** — 한정판 배지가 흰 알약으로 올라간다. 배지는 자기 배경을 갖고 있어 무엇 위에든 읽히지만, 제품이나 랜드마크의 핵심이 거기 몰리면 가려진다.

앞면에는 15% 검정 스크림이 전면에 한 겹 깔려 있다. 밝게 뽑혀도 한 번은 눌러주지만 그건 보정이지 해결이 아니다.

## 한정판

`product.limited`가 `true`여도 프롬프트에 `limited edition`을 넣지 않는다. 넣으면 모델이 리본이나 금박을 그려 넣고, 그건 브랜드가 승인한 적 없는 장식이다. 희소성은 배지와 시리얼이 말한다.

## 실패했을 때 의심할 것

| 증상 | 원인 |
|---|---|
| 제품 로고가 비슷하지만 다른 글자로 바뀜 | 첨부 사진의 로고가 작거나 흐림. 로고가 선명한 컷으로 교체 |
| 랜드마크가 잘려서 뭔지 모르겠음 | `complete enough to be identified`를 강조하거나 `{landmark}`를 더 구체적으로 |
| 제품이 도시 사진 위에 합성된 것처럼 뜸 | 중간 지대가 빠진 것. `Between them, ordinary street level` 문장을 앞으로 당긴다 |
| 랜드마크가 너무 선명해 제품이 묻힘 | `softly out of focus` / `half a step back` 강조 |
| 밑동이 하얗게 날아 글자가 안 보임 | `mid to deep tones` 강조하거나 다시 뽑는다 |
