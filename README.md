# Band Management Game — Mobile UX Prototype

밴드 육성/경영 모바일 게임의 **Mobile UX Prototype** (PHASE 1: App Shell + Route/Screen shell + Navigation + Master/Save 데이터 구조).

기획·캐릭터·UX·비주얼의 Source of Truth는 [`docs/`](docs/README.md)의 4개 PDF다. 이 저장소는 그 문서를 **구현**할 뿐, 재해석하지 않는다.

- 플랫폼: 모바일 웹 / PWA, 세로 우선 (390px 전후 기준)
- 스택: Vite + React 18 + TypeScript + react-router (hash) + zustand(persist → localStorage)
- 배포: GitHub Pages, `gh-pages` 브랜치 (`npm run deploy` = build + gh-pages push) → https://thstjdals09-lang.github.io/band-game/

## 실행

```bash
npm install
npm run dev        # http://localhost:5173/band-game/  (--host: 같은 Wi-Fi의 폰에서 접속 가능)
npm run build      # tsc --noEmit + vite build → dist/
npm run preview
npm run deploy     # dist/ → gh-pages 브랜치 → GitHub Pages
```

## 구조

```
src/
  app/          routes.tsx (route map + layer/dock meta), router.tsx (hash router), AppShell.tsx, navigation.ts (Back/Close 규칙)
  assets/       registry.ts  — 에셋 키 → URL | null.  null이면 [PLACEHOLDER_KEY] 박스로 렌더
  components/   Panel, Dock(5개 고정), Hud, PlaceholderAsset, CharacterVisual, ui primitives
  data/master/  Character Master v1.1 원본 데이터 (C01~C15), traits, contractProfiles, synergies, events, facilities/venues/slots
  state/        save/schema.ts (SaveData v1), save/newGame.ts, store.ts (zustand persist), selectors.ts (파생값), actions/ (유일한 mutation 지점)
  world/        WorldScene 계약 + DomWorldView(placeholder 렌더러) + BasecampWorld. Phaser 렌더러로 교체 가능한 경계
  screens/      start / home / band / audition / schedule / performance / management / outside / future / dev
```

### 원칙 (문서에서 파생)

- **Master ≠ Save**: `data/master`는 불변, 런타임 변화는 `SaveData`에만. 파생값(케미, 장르, 예상치)은 `selectors.ts`에서 재계산하고 저장하지 않는다. 끝난 공연은 `performanceHistory`에 Snapshot으로 영구 저장.
- **UI는 계산식을 쓰지 않는다**: 화면은 selector/action만 호출.
- **내부 rarity 비노출**: `internalRarity`는 UI가 읽지 않는다.
- **HOME은 탭이 아니다**: Dock은 BAND / SCHEDULE / AUDITION / MANAGEMENT / OUTSIDE 5개. HOME에서는 어느 Dock도 Active가 아니다. 몰입 플로우(Candidate Detail, Contract, Week Resolution, Performance, Result)에서는 Dock/HUD를 숨긴다.
- **에셋 없는 곳은 placeholder**: CSS로 그림을 흉내내지 않는다. `assets/registry.ts`에 URL만 넣으면 교체된다.
- **Back 규칙**: 최상위 패널 Close → HOME, 하위 패널 Back → 직전, Week Resolution / Performance는 Back 잠금(`useLockBack`). 브라우저 Back과 게임 내 Back이 같은 곳으로 가도록 history를 그대로 사용.

## Prototype Spine (현재 클릭 가능한 흐름)

NEW GAME → BASECAMP → AUDITION → Candidate Detail → (Shortlist / Compare) → Contract → BAND / Lineup → Session Hire → SCHEDULE → NEXT WEEK → Week Resolution (→ 밴드 이름 이벤트 / NEW SONG) → BASECAMP 변화 → Opportunity Inbox → Performance Prep → PERFORMANCE → Choice → RESULT → MANAGEMENT / FACILITIES → BUILD → Expanded Basecamp

시뮬레이션 수치는 전부 placeholder다(`TODO(PHASE2 engine)` / `TODO(balance)` 주석 참조).

## 문서와 충돌하거나 판단이 필요한 항목

`CLAUDE.md`의 "판단 필요 / TODO" 섹션 참조.
