# Band Management Game — Mobile UX Prototype

밴드 육성/경영 모바일 게임의 **Mobile UX Prototype**. 현재 범위: App Shell + 아이소메트릭 월드 + **반복 가능한 주간 성장 루프**(PHASE 2A).

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
npm run test       # vitest (월드 + 성장 루프 단위 테스트 78개)
npm run deploy     # dist/ → gh-pages 브랜치 → GitHub Pages
```

실제 브라우저 플레이 검수는 [`tests/e2e/`](tests/e2e/README.md)에 있다 (preview 실행 후 `node tests/e2e/phase2a.mjs`).

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
  state/sim/    주간 시뮬레이션 엔진 — rng(시드 스트림) / growth(성장 곡선) / musicDna / song(4축) /
                weekEngine(simulateWeek) / performance(공연 결과) / career(티어·마일스톤·해금)
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

QA용 테스트 프리셋(A~H)은 `/dev`에서 적용한다. `/dev`는 HUD의 주차 표시를 5번 연타해서도 열 수 있고, 한 번 열면 작은 DEV 칩이 생긴다. 아이소메트릭 월드 검수는 `/dev/world`. 플레이어 UI에서는 둘 다 접근할 수 없다.

HOME은 한 장짜리 배경이 아니라 그리드 좌표를 가진 타일 월드다. 오브젝트는 기기에 관계없이 같은 맵 좌표에 있고 카메라 zoom/offset만 변한다. 에셋 규격은 `docs/BASECAMP_STAGE1_ASSET_PRODUCTION_SPEC.md` 참조.

시뮬레이션 수치는 전부 placeholder다. 밸런스 값은 `src/data/master/prototypeBalance.ts`에 격리되어 있으며 Source of Truth가 아니다(`TODO(PHASE2 engine)` / `TODO(balance)`).

Lineup은 가변 슬롯 리스트다. 새 밴드는 core 4포지션(VOCAL / GUITAR / BASS / DRUMS)으로 시작하고, KEYS 등 추가 포지션은 이후 밴드 구성/성장 기능에서 추가된다. Synth는 KEYS 계열이지만 Producer는 KEYS에 매핑되지 않는다. Debut Showcase는 데모 2곡이 준비된 뒤에만 제안된다.

## 주간 루프 (PHASE 2A)

일정 편성 → 멤버 육성 · 곡 제작 → 공연 → 보상 → 커리어 성장 · 시설 해금 → 다음 주 일정, 이 순환이 계속 반복된다.

- 한 주는 `simulateWeek(save)`가 **한 번** 계산하고 `commitWeek(outcome)`이 그대로 적용한다. Week Resolution 화면이 보여준 결과가 곧 확정되는 결과이며, 화면 재진입이나 새로고침으로 중복 지급되지 않는다.
- 활동 선택이 결과를 바꾼다: 연습·녹음은 경험치와 피로를, 홍보는 팬을, 휴식은 회복을 만든다. 지치거나 스트레스가 높은 멤버는 덜 배운다.
- 곡은 멤버 능력·Music DNA·컨디션·제작 맥락에서 4축(대중성/음악성/팬 적합/라이브)이 계산된다. 첫 공연 이후 싱글·EP 발매가 열리고 음원 수익이 매주 들어온다.
- 공연 제안은 반복해서 들어오고, 팬이 늘면 더 큰 공연장에서 부른다. 공연 결과는 밴드의 누적 상태에서 나온다.
- 커리어 티어와 마일스톤은 저장하지 않고 기록에서 파생한다. 시설 해금도 마일스톤 / 티어 데이터로 판정한다.

관계·케미(6축)·Special Pair Chemistry·이벤트 엔진·숨은 특성 발견은 **PHASE 2B**이며 아직 구현되지 않았다. 곡 계산의 관계 항은 0을 반환하는 연결 지점으로만 존재하고, 케미 화면은 값을 지어내지 않고 '—'와 사유를 보여준다.

## 문서와 충돌하거나 판단이 필요한 항목

`CLAUDE.md`의 "판단 필요 / TODO" 섹션 참조.
