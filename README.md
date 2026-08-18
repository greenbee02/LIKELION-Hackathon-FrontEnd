# Curio

명품 구매를 수집 가능한 **카드**로 바꾸는 멀티 브랜드 플랫폼. 구매 후 영수증 QR을 스캔하면 디지털 카드가 발급되고, 카드가 구매 기록·상품 정보·보증/케어·SNS 공유·리워드를 하나로 잇는다. 실물 카드는 범위 밖이다.

Curio는 플랫폼의 이름이고, 카드에 서명하는 것은 각 브랜드다. MCM은 데모 브랜드일 뿐 앱의 색·서체·카피는 어느 브랜드에도 속하지 않는다.

- 기획서: [`dev/active/product-brief.md`](dev/active/product-brief.md)
- 구현 범위 · 백엔드 대조: [`dev/active/scope-vs-backend.md`](dev/active/scope-vs-backend.md)
- 작업 규칙 · 디자인 결정: [`AGENTS.md`](AGENTS.md)

## 스택

Expo SDK 57 + Expo Router + React Native 0.86 + React Native Web + TypeScript. 하나의 코드베이스가 Expo Go, 네이티브 개발 빌드, 웹 export에서 모두 돈다. 라우트는 `src/app/`, `@/*` → `src/*`.

## 실행

```bash
npm install
npm start        # Expo 개발 서버 (i / a / w 로 각 플랫폼 열기)
npm run ios
npm run android
npm run web
npm run lint
```
