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
npm run test       # vitest (world 단위 테스트)
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
  world/        논리 아이소메트릭 월드
    iso/        coordinates / projection / depth / occupancy / camera / hitTest (픽셀 무관 수학)
    maps/       basecampStage1 + Stage2 MapPatch (논리 그리드 맵 데이터)
    objects/    footprint / anchor / state variant 정의 + SaveData 바인딩
    renderer/   WorldScene 계약 + SVG 디버그 렌더러 (Phaser로 교체 가능)
    assets/     스프라이트 계약 (footprint / anchor / depth anchor / state)
  screens/      start / home / band / audition / schedule / performance / management / outside / future / dev
```

### 원칙 (문서에서 파생)

- **Master ≠ Save**: `data/master`는 불변, 런타임 변화는 `SaveData`에만. 파생값(케미, 장르, 예상치)은 `selectors.ts`에서 재계산하고 저장하지 않는다. 끝난 공연은 `performanceHistory`에 Snapshot으로 영구 저장.
- **UI는 계산식을 쓰지 않는다**: 화면은 selector/action만 호출.
- **내부 rarity 비노출**: `internalRarity`는 UI가 읽지 않는다.
- **HOME은 탭이 아니다**: Dock은 BAND / SCHEDULE / AUDITION / MANAGEMENT / OUTSIDE 5개. HOME에서는 어느 Dock도 Active가 아니다. 몰입 플로우(Candidate Detail, Contract, Week Resolution, Performance, Result)에서는 Dock/HUD를 숨긴다.
- **에셋 없는 곳은 중립 placeholder**: CSS로 아트를 흉내내지 않는다. 키 문자열은 플레이어 화면에 절대 보이지 않고 `data-asset` 속성으로만 남는다. `assets/registry.ts`에 URL만 넣으면 교체된다.
- **개발 정보 분리**: asset key와 구현 메모는 `/dev`의 diagnostics 토글을 켤 때만 보인다. 일반 플레이 화면에는 TODO·문서 참조·키 문자열이 없다.
- **Back 규칙**: 최상위 패널 Close → HOME, 하위 패널 Back → 직전, Week Resolution / Performance는 Back 잠금(`useLockBack`). 브라우저 Back과 게임 내 Back이 같은 곳으로 가도록 history를 그대로 사용.

## Prototype Spine (현재 클릭 가능한 흐름)

NEW GAME → BASECAMP → AUDITION → Candidate Detail → (Shortlist / Compare) → Contract → BAND / Lineup → Session Hire → SCHEDULE → NEXT WEEK → Week Resolution (→ 밴드 이름 이벤트 / NEW SONG) → BASECAMP 변화 → Opportunity Inbox → Performance Prep → PERFORMANCE → Choice → RESULT → MANAGEMENT / FACILITIES → BUILD → Expanded Basecamp

QA용 테스트 프리셋(A~H)은 `/dev`에서 적용한다. 아이소메트릭 월드 검수는 `/dev/world`. 플레이어 UI에서는 둘 다 접근할 수 없다.

HOME은 한 장짜리 배경이 아니라 그리드 좌표를 가진 타일 월드다. 오브젝트는 기기에 관계없이 같은 맵 좌표에 있고 카메라 zoom/offset만 변한다. 에셋 규격은 `docs/BASECAMP_STAGE1_ASSET_PRODUCTION_SPEC.md` 참조.

시뮬레이션 수치는 전부 placeholder다. 밸런스 값은 `src/data/master/prototypeBalance.ts`에 격리되어 있으며 Source of Truth가 아니다(`TODO(PHASE2 engine)` / `TODO(balance)`).

Lineup은 가변 슬롯 리스트다. 새 밴드는 core 4포지션(VOCAL / GUITAR / BASS / DRUMS)으로 시작하고, KEYS 등 추가 포지션은 이후 밴드 구성/성장 기능에서 추가된다. Debut Showcase는 데모 2곡이 준비된 뒤에만 제안된다.

## 문서와 충돌하거나 판단이 필요한 항목

`CLAUDE.md`의 "판단 필요 / TODO" 섹션 참조.
