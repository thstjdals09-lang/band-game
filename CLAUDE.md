# CLAUDE.md — Band Management Game (Mobile UX Prototype)

이 저장소는 `C:\Users\a\Desktop\Bandgame\band-game`에 있는 **독립 프로젝트**다. 다른 프로젝트(casino, danbi, holdem 등)의 규칙·메모리·자동 commit/push 설정을 상속하지 않는다.

## 작업 규칙

1. 구현 전에 `docs/`의 4개 PDF(GDD v0.2, Character Master v1.1, Mobile IA v1.1, Visual Bible v1.0)를 기준으로 삼는다. 코드와 충돌하면 문서가 우선.
2. 기획/비주얼을 새로 창작하거나 재해석하지 않는다. 문서에 없는 디자인 판단은 코드에 `TODO(...)` 주석 + 아래 "판단 필요" 목록에 남긴다.
3. 에셋이 없는 부분은 `[PLACEHOLDER_KEY]`로 둔다 (`src/assets/registry.ts`). CSS로 아트를 흉내내지 않는다.
4. Character Master의 이름/포지션/수치를 바꾸지 않는다 (`src/data/master/characters.ts`).
5. UI에 계산식을 쓰지 않는다. 파생값은 `src/state/selectors.ts`, 변경은 `src/state/actions/`.
6. commit/push는 사용자가 요청할 때만.

## 진행 상황 로그

### 2026-09-19 — PHASE 1: App Shell
- Vite + React + TS 프로젝트 생성, GitHub 저장소 `thstjdals09-lang/band-game` 생성, PDF 4종을 `docs/`에 저장.
- Master Data(C01~C15, traits, contract profiles, synergies, event hooks, facilities/venues/slots/activities/session templates) 작성.
- SaveData v1 스키마 + newGame + zustand persist(localStorage `band-game.save.v1`) + migrate 진입점.
- App Shell: World layer(Basecamp placeholder 렌더러) + HUD + Panel layer + 5 Dock. 몰입 플로우에서 Dock/HUD 숨김.
- 전 route/screen shell 생성 및 네비게이션 연결 (Prototype Spine 전체 클릭 가능, 시뮬레이션은 placeholder).
- GitHub Pages 배포: gh 토큰에 workflow 스코프가 없어 Actions 워크플로 대신 `npm run deploy`(gh-pages 브랜치)로 배포. Playwright(로컬 Chrome) 스모크 테스트로 Prototype Spine 전 구간 통과 확인.

### 2026-09-19 — PHASE 1.1: Structure Check (검수 반영, 신규 기능 없음)
- Lineup을 고정 5슬롯 Record에서 **가변 슬롯 리스트**(`band.lineup: LineupSlotState[]`)로 변경. VS 기본은 core 4포지션(VOCAL/GUITAR/BASS/DRUMS). KEYS 등은 `SLOT_DEFINITIONS`에 expansion(`core: false`)으로 정의하고 `bandActions.addLineupSlot`은 구조만 준비(UI 없음). 세션 보충/역할 변경은 슬롯 index 기반.
- 승인된 Save 필드(band.lineup / shortlistIds / compareIds / opportunities / pendingPerformance / counters)를 SaveData v1 정식 필드로 정리. schemaVersion 유지. `save/migrate.ts`의 `ensureSaveDefaults`가 매 로드마다 누락 필드를 채우고 구형 lineup Record를 리스트로 변환(store `merge`에서 호출).
- 밸런스 수치를 `src/data/master/prototypeBalance.ts`(전부 TODO(balance))로 격리. Hero HUD 값(₩3,000,000 / 100 / 10)은 시각용 placeholder임을 명시.
- Debut Showcase 스크립트: 창작 주간마다 데모 1곡, `minSongsForDebut = 2` 도달 후에만 Basement Club 제안 생성. Prep / Performance는 2곡 미만이면 시작 불가. 첫 공연은 Opening Song 선택만 제공, full Setlist Editor는 이후 기능.
- `styles/tokens.css`를 "PROTOTYPE APPROXIMATION - NOT Implementation Lock"으로 명시.
- 승인 반영: C05 = HIGH_START_SLOW, C13 = HIGH_START. Band Name Event placeholder chips + 자유 입력 유지. gh-pages 배포 유지(Actions 미추가).

### 2026-09-19 — PHASE 1.2: Mobile UX Cleanup (신규 기능 없음)
- **개발 정보 분리**: `state/devStore.ts`(localStorage `band-game.dev`)에 diagnostics 플래그 추가. OFF(기본)에서는 asset key / 구현 메모가 어디에도 렌더되지 않는다. `PlaceholderAsset`은 중립 프레임 + 캐릭터 실루엣만 그리고 키는 `data-asset` 속성으로만 노출. `Todo` 컴포넌트를 `DevNote`로 교체(dev 전용).
- **모바일 가독성**: 타입 스케일(본문 15px, 리드 17px, 타이틀 19px) · 최소 터치 44~48px · HUD 42px / Dock 66px · gutter 16px로 재조정. 화면 전체를 한국어 플레이어 카피로 정리.
- **화면별**: START(개발 문구 제거) / HOME(월드 라벨 한국어, 상황별 CTA 카드) / AUDITION(후보 카드·스탯 확대) / COMPARE(사실 → 스탯 → 적합도, 엔진 필요한 항목은 "아직 알 수 없음" + 이유) / CANDIDATE DETAIL(비주얼 우선, KNOWN/UNCERTAIN/UNKNOWN 재구성) / CONTRACT(협상 장면 + 선택 상태 강화) / BAND(future shell을 ⋯ 오버플로로 이동, 라인업 우선) / SESSION HIRE(비용·실력·신뢰도 + "이 포지션에 고용" CTA) / SCHEDULE(활동 카드에 설명·영향·비용) / WEEK RESOLUTION(단계마다 무엇이 바뀌었는지) / BAND NAME EVENT(자연스러운 샘플 이름) / NEW SONG(보상 단계 위계) / INBOX(공연장·수용·마감, 수락이 main CTA) / OUTSIDE(Local Venues 우선) / FACILITIES(건설 가능 / 보유 / 잠김 구분).
- **DEV 프리셋**: `state/devPresets.ts` + `/dev`. A~H 9종(B2 포함)을 실제 action 재생으로 구성. 플레이어 UI에서는 진입 불가.
- **버그 수정**: 진단 모드의 asset key 오버레이가 패널 위 탭을 가로채던 문제(z-index/pointer-events). 월드 레이어는 패널이 열리면 `pointer-events: none`.
- **검증**: tsc / build 통과. Playwright 스모크가 Prototype Spine 전 구간 + 30개 화면 개발문자열 검사 + 터치 타깃 40px 검사 + 프리셋 A/B/E/F/H + 진단 토글 + 구형 세이브 마이그레이션까지 통과, 콘솔 에러 0.

### 2026-09-19 — WORLD FOUNDATION 1: True isometric tile world
- HOME을 스크린 % 배치에서 **논리 아이소메트릭 타일 월드**로 교체. 데이터 흐름: maps → iso → objects → renderer → React wrapper.
- `world/iso/`: coordinates / projection / depth / occupancy / camera / hitTest. 픽셀과 무관한 논리 좌표가 기준이고 tile render 크기는 PROTOTYPE RENDER VARIABLE.
- `world/maps/`: Stage 1 지하 연습실(13×8 논리 맵), Stage 2는 **MapPatch**로 부분 확장(배경 이미지 교체 아님).
- `world/objects/`: footprint / anchor / depth anchor / interaction tile / state variant 정의 + SaveData에서 오브젝트 state 바인딩(새 시설 시스템 없음).
- `world/renderer/`: WorldScene 계약 + SVG DebugIsoWorldView. 드로우 순서는 월드 좌표에서 계산하고 z-index 하드코딩 없음. Phaser로 교체 가능.
- 캐릭터는 spawn point(그리드 좌표)에 배치. 이동/패스파인딩은 구현하지 않음.
- 카메라: 맵은 하나, 기기별로 zoom/offset만 변한다. `fitCameraFocused`가 탭 가능한 오브젝트를 safe viewport 안에 보장하면서 최대로 확대한다.
- `/dev/world` ISOMETRIC WORLD LAB 추가(Stage 전환, 오버레이 7종, viewport preset 5종, draw order/occupancy 리포트).
- vitest 도입, `src/world/world.test.ts` 34케이스. 기존 Playwright 스모크도 유지.
- 에셋 제작 사양: `docs/BASECAMP_STAGE1_ASSET_PRODUCTION_SPEC.md`.

### 2026-09-19 — WORLD VISUAL FIT TEST
- **진단 먼저, 수치 변경 없음.** 390×844 실측: safe rect 0,42 · 390×736(중심 195,410), zoom 0.417(clamp 아님), world bounds 1152×653, required 896×480, 화면상 월드 481×272(중심 195,401), 세로 채움 37%, 가로 overflow 91px.
- 랩이 작게 보인 것은 랩 버그가 아니다. 내부 device div의 transform이 containing block을 만들어 390×844를 정확히 시뮬레이션하고 표시만 0.769배 축소한다(카메라 값은 HOME과 동일).
- 확인된 결함 1건(미수정): Stage 1의 북쪽 벽이 x 0..12까지 그려지는데 cameraBounds는 x 0..9만 프레임한다. 드로잉 폭 1344 vs 프레임 1152 = 192 world px가 프레임 밖.
- 테스트 스프라이트: C01_MASTER_DIRECTIONS_PIXEL_TEST_03의 좌상단 서 있는 포즈를 connected component로 추출(149×318) → `src/assets/world/C01_TEST_FRONT.png`. 발 접지 중심 x≈61, 바닥 y=318.
- `world/assets/testSprite.ts`에 개발용 파라미터(enabled / heightUnits / footAnchor / applyToAllCharacters). **최종 규격 아님.** /dev/world에서 실시간 조정.
- 렌더러가 sprite를 받으면 중립 블록 대신 실제 이미지를 그리고, 발 기준점이 depth anchor 타일 중심에 정확히 닿는다.
- WORLD BOUNDS 오버레이 추가(실제 월드 경계 + required rect를 디버그 문구와 구분).
- 결과: 2.2u에서 캐릭터가 화면상 29px. 방 비율/카메라 결정을 위한 판단 근거 확보.

### 2026-09-19 — PLAY CAMERA: fixed zoom + free drag (카메라만 수정)
- **방 전체를 화면에 맞추는 조건 해제.** HOME은 `createCamera`가 고정 즐(defaultZoom 1.0)으로 그리고, 화면 밖은 드래그로 탐색한다.
- 캐릭터 화면 크기 29px → **70px**(2.4배). 타일 128px.
- 2축 자유 패닝. `clampAxis`가 월드를 화면 밖으로 버리지 못하게 막고(panMargin 72px 오버스크롤), 모든 모서리에 도달 가능하다.
- 초기 시점은 바닥 중심(`focusPointOf`). 맵이 바뀜면 pan 리셋.
- 빌드/프리뷰 면(Facilities, 랩)은 종전처럼 전체 프레이밍 유지(`cameraMode: 'fit'`, mode==='build'에서 자동). **게임 UI 파일은 하나도 수정하지 않았다.**
- **버그 수정**: pointerdown에서 pointer capture를 잡으면 이후 click이 캐러 요소로 retarget되어 오브젝트 탭이 전부 죽는다. 드래그로 판정된 뒤에만 캡처하도록 변경.
- 드래그 임계값 6px. 드래그 뒤 따라오는 click은 무시해 패닝이 네비게이션을 일으키지 않는다.
- 랩에 play zoom 스테퍼와 drag range X/Y, character on screen 진단 추가.
- 테스트 45개. 카메라 계약이 바뀜 기존 fit 전제 테스트 3개를 새 계약(고정 즐 / offset 변화 / 드래그 도달성)으로 교체했다.

### 2026-09-19 — DEV 접근 편의성 (플레이어 UI 노출 없음)
- 주소창 입력 없이 /dev로 가는 경로 두 가지. 둘 다 기본 상태에서는 보이지 않는다.
- **비밀 제스처**: HUD의 주차 표시(Y1 W01) 또는 START 화면 타이틀을 1.6초 안에 5번 연타. 커서·호버·라벨 없음.
- **DEV 칩**: /dev를 한 번 열면 chrome 레이어 우측 상단에 작고 흐림한 칩이 생긴다. /dev → Access에서 끄면 다시 숨겨지고 제스처만 남는다.
- `devAccess`는 devStore(localStorage `band-game.dev`)에만 있고 SaveData와 무관하다. 몰입 화면(공연/주간 정리)에서는 chrome과 함께 숨겨진다.

### 2026-09-19 — Dev 튜닝 값 저장
- 진단: 캐릭터 height는 이미 devStore에 저장되어 HOME에도 적용되고 있었다(70→90px, 리로드 유지 확인). 저장되지 않던 것은 **카메라 즐** 하나루였다(랩 로컬 useState).
- `playZoom`을 devStore로 옮겨 저장하고, BasecampWorld가 play 카메라에 적용한다. 랩 밖 HOME과 새로고침 모두 유지.
- 랩의 stage / viewport preset도 저장되어 다시 열면 그 상태로 돌아온다.
- 랩 맨 위에 "저장 상태" 섹션 추가: 현재 값과 기본값 차이(*) 표시, RESET ALL TUNING 버튼.
- devStore는 localStorage `band-game.dev`에만 있고 SaveData와 무관하다. 기본값은 여전히 코드의 defaultZoom / DEFAULT_TEST_SPRITE이다.

### 2026-09-19 — PHASE 2A: Growth Loop (반복 가능한 주간 루프)
- 한 주가 **순수 함수 `simulateWeek(save) → WeekOutcome`** 으로 계산되고, `commitWeek(outcome)`이 그 객체를 **한 번만** 적용한다. 3중 가드(주차·연차 일치 / rng 위치 일치 / 계획 존재)로 화면 재진입·새로고침 중복 지급을 막는다.
- 활동이 실제로 다르게 작용한다: 합주(경험치↑ 피로↑) / 녹음(경험치↑↑ 피로↑↑, 녹음실 필요) / 홍보(팬↑) / 휴식(회복) / 개인 일정(해당 멤버만). 체력·스트레스가 낮으면 경험치 획득이 줄어든다(`effectiveExperience`).
- 성장: Character Master의 12개 growth curve를 `growthMultiplier`로 구현, 경험치 → 단계 → 스탯 상승. 상승폭은 `overallPotential` 잔여치와 `statBias`로 배분하며 잠재치를 넘지 않는다.
- 곡: `createSong`이 Music DNA(평균·분산·극단값·역할 가중치) + 멤버 능력 + 컨디션 + 제작 맥락으로 GDD §06 4축을 계산한다. 2곡 상한 제거, 제목 중복 없음, 발매(SINGLE/EP)는 첫 공연 이후 해금되고 주간 음원 수익이 감쇠하며 들어온다.
- 공연: 제안이 **반복 발생**한다(곡 보유 / 미예약 / 쿨다운 조건, 팬 수에 따라 Basement Club → Moonlight Club). 결과는 실력·무대력·곡 라이브 적합도·컨디션·라이브 안정성의 가중합이며 순간 선택과 난수는 보정치일 뿐이다.
- 커리어: `career.ts` master data(티어·마일스톤·수익원·발매 형식). 마일스톤은 기록에서 **파생**되고 저장하지 않는다. Unknown → Local Act 승급 확인. 시설 해금은 하드코딩을 걷어내고 `unlock: ALWAYS | MILESTONE | CAREER_TIER` 데이터로 판정한다.
- PHASE 1.1 승인 사항 반영: `SLOT_DEFINITIONS.KEYS.compatiblePositions`에서 `'Producer'` 제거.
- 검수: 단위 테스트 78개 + 실제 브라우저 플레이 7주 연속(`tests/e2e/phase2a.mjs`) + 구형 세이브 호환(`compat.mjs`) + 전체 동선 스모크(`smoke.mjs`) 모두 통과.
- PHASE 2B(관계·케미 6축·Special Pair Chemistry·이벤트 엔진·숨은 특성 발견)는 포함하지 않았다. 곡 계산의 관계 항은 `relationshipContribution()`이 **0을 반환**하는 연결 지점으로 분리해 두었고 임의 수치를 넣지 않았다.

### 2026-09-19 — PHASE 2A 연결 오류 수정 (공연 / 홍보 / EP 기록)
GDD 대조 보고서에서 확인된 구현 오류 3건만 수정. 밸런스 수치, 곡 생성 규칙, 녹음–발매 관계, 커리어 조건은 변경하지 않았다.
- **공연이 실제 주간 활동이 되었다.** 제안 수락 → 주간 일정 공연 슬롯 → 무대 → 결과 확정이 하나로 이어진다.
  - 공연 제작비·체력·스트레스·사기·멤버 경험치는 전부 `performanceActions.commit`(실제 공연)에서 한 번만 적용된다. 수치는 기존 `activityEffects.LIVE_SHOW`와 활동 비용 그대로다.
  - 주간 엔진은 LIVE_SHOW 슬롯에서 비용·컨디션을 **전혀 적용하지 않고**, 그 주에 실제로 있었던 공연을 되짚는 카드만 보여준다. 공연을 안 했으면 "무대에 오르지 않은 채로 한 주가 지났다"로 남고 예약은 유지된다.
  - `projectedExpense`에서도 LIVE_SHOW를 제외했다. 예약만 해 둔 슬롯은 아무것도 청구하지 않는다.
  - Performance Prep은 이번 주 일정에 공연 슬롯이 있어야 시작할 수 있고, 같은 주에 두 번 오를 수 없다.
  - `performanceActions.commit`은 예약이 없으면 아무것도 하지 않는다 → 화면 재진입·새로고침으로 재정산 불가.
  - GDD §06 공연 보상의 "멤버 경험"이 이제 실제로 지급된다(무대에 선 멤버만).
- **홍보 반복 반영**: 같은 주 홍보 슬롯 수만큼 팬·충성도가 증가한다(1칸 +36 / 2칸 +72 / 3칸 +108). 슬롯당 수치는 그대로.
- **EP 발매 기록**: `SongStatus`에 `RELEASED_EP` / `RELEASED_ALBUM`을 추가하고 발매 형식에 맞는 상태를 기록한다. 기존 `RELEASED_SINGLE` 세이브는 `isReleased()`로 그대로 읽힌다(마이그레이션 없음).
- 검수: 단위 테스트 86개 + 브라우저 5종(`showslot` 신규 / `smoke` / `phase2a` 7주 / `compat` / `practicecost`) 전부 통과.

### 2026-09-19 — 곡 제작·합주·녹음·발매 v1
사용자가 확정한 v1 규칙 결정안을 명세로 구현. GDD와 충돌하는 부분은 이번에 새로 결정한 규칙을 우선했다.
- **규칙 1 — 예약제 작곡**: Songs 화면에서 "새 곡 작업"을 예약해야 다음 합주 1슬롯이 데모를 만든다. 예약 없는 합주는 곡을 만들지 않는다. 예약은 그 주로 소멸한다.
- **규칙 2 — 나머지 합주 = 공연 준비**: 남는 합주 슬롯은 기존 곡을 다듬는다. 대상은 공연 대표곡(`pendingPerformance.openingSongId`)을 자동으로 따라가고, Songs 화면에서 다른 곡으로 바꾸거나 자동 연결로 되돌릴 수 있다. 멤버 경험치·컨디션 효과는 모든 합주 슬롯에서 종전과 동일하다.
- **규칙 3 — 녹음**: 기존 데모를 발매 가능한 음원으로 만든다. 녹음실 + 유효 대상 필요, **주당 1슬롯**(두 번째 녹음을 넣으면 앞 칸이 비워진다). 새 곡을 만들지 않는다. 대상이 없으면 아무것도 녹음하지 않고 **비용도 청구하지 않는다**.
- **규칙 4 — 발매**: 미녹음 곡은 공연에 쓸 수 있지만 발매할 수 없다. 녹음 완료 + 미발매 곡만 싱글/EP로 낼 수 있고 주당 발매 횟수 제한은 없다.
- **규칙 5 — 주간 확정**: 예약과 대상은 주간 진행 시작 시점의 계획으로 확정되고, 같은 주에 만든 곡은 그 주의 합주·녹음 대상이 될 수 없다.
- SaveData 추가(가산적): `SongState.recordedWeek` / `SongState.rehearsalCount`, `WeeklyPlan.songWork { newSong, rehearsalSongId, recordingSongId }`. `ensureSaveDefaults`가 구형 세이브를 채우며 **이미 발매된 구형 곡은 녹음 완료로 간주**한다. schemaVersion 유지.
- 수치 변경 없음: 합주·녹음 경험치/컨디션, 녹음 비용 ₩150,000, 발매 보상, 기본 합주 비용 0원 모두 그대로다.
- 검수: 단위 테스트 102개 + 브라우저 6종(`songwork` 신규 / `smoke` / `phase2a` / `compat` / `practicecost` / `showslot`) 통과. 휴식 포함 일정에서 **첫 공연까지 5주**.

## 판단 필요 / TODO (문서에 없거나 모호한 항목)

- ~~Growth Curve 표기~~ 승인됨(PHASE 1.1): C05 = HIGH_START_SLOW, C13 = HIGH_START.
- ~~Lineup 슬롯 수~~ 해결(PHASE 1.1): 가변 슬롯 구조, VS 기본 core 4포지션. 추가 포지션 해금 조건은 PHASE 2+ 설계.
- ~~SaveData 추가 필드~~ 승인됨(PHASE 1.1): SaveData v1 정식 prototype 필드, schemaVersion 유지.
- **동일 포지션 중복 슬롯** (결정, PHASE 1.1 승인 시): 데이터 구조상 허용하되 Vertical Slice 초기 UI에서는 기본 core slots만 노출한다.
- ~~Synth / Producer 슬롯 규칙~~ 해결(PHASE 2A에서 코드 반영): `SLOT_DEFINITIONS.KEYS.compatiblePositions`에서 `'Producer'` 제거. Synth만 KEYS 계열. C06 한예준은 Keys 포지션을 함께 가지므로 KEYS 배치가 계속 가능하다. Producer의 creative/production role 시스템은 PHASE 2+.
- **밸런스 전부 TODO(balance)**: 시작 자금/Fans/Fame, 계약 금액, 시설 가격, 세션 비용, 공연 수익 등은 `prototypeBalance.ts` 및 각 master 파일의 placeholder. Hero HUD 값은 Source of Truth가 아니다.
- **밴드 이름 이벤트**: IA §26의 "멤버 성향 기반 이름 제안"은 이후 구현. 현재 placeholder 칩 + 자유 입력(승인됨).
- ~~첫 공연 곡 수~~ 해결(PHASE 1.1): 2곡 확보 후 공연 제안. 창작 주간당 1곡 템포는 플레이테스트 변수.
- **Performance 순간 선택 텍스트**: 사용자 지시의 민채린 솔로 예시를 GUITAR 슬롯 멤버 이름으로 치환해 사용. 실제 대사/이벤트 정의는 VS 콘텐츠 단계.
- **Display 폰트/아이콘/팔레트 hex**: Implementation Lock 아님. 브러시·마커 Display 폰트와 Dock 아이콘 에셋 없음 → 시스템 폰트 + 글자 placeholder. `styles/tokens.css`는 PROTOTYPE APPROXIMATION.
- **Dev Tools(`/dev`)**: IA에 없는 프로토타입 검수용 화면. 출시 빌드에서 제거 대상.
- ~~방 크기와 세로 여백~~ 해결: 방 전체 맞춤을 포기하고 고정 즐 + 2축 드래그로 전환. 기본 즐 1.0은 PROTOTYPE VARIABLE이며 /dev/world에서 조정한다.
- **Stage 1 타일 좌표**: 현재 배치는 임시값(FINAL ART POSITION 아님). 승인된 방 아트가 나오면 재작성한다.
- **tile render 크기 128×64**: PROTOTYPE RENDER VARIABLE. 2:1 비율만 규칙이고 절대값은 미확정.
- **캐릭터 가림 처리**: depth order는 완성됐으나 실제 sprite masking은 아트 도착 후 검증 필요.
- **Stage 1 북쪽 벽 x 10..12** (확인된 결함, 미수정): Stage 1은 그 위치에 바닥이 없는데 벽만 그린다. Stage 1 벽을 x 0..9로 줄이고 Stage 2 패치가 x 10..11을 추가하는 것이 해법. 프레이밍 판단과 얮혀 있어 지시 대기 중.
- **테스트 스프라이트 수치**: heightUnits 2.2 / footAnchor (61,318)은 개발 기본값이며 확정 규격이 아니다.
- **PHASE 2A에서 문서에 수치가 없어 임의 확정하지 않은 항목** (전부 `prototypeBalance.ts`의 `TODO(balance)`):
  활동별 체력/스트레스/사기/경험치 변화량, 단계당 필요 경험치(600)와 스탯 포인트(6), 저체력·고스트레스 페널티 계수,
  공연 제안 쿨다운(1주)과 Moonlight Club 승급 팬 수(260), 지역 팬덤 마일스톤 팬 수(300), 음원 주간 수익 감쇠와 지급 기간,
  발매 형식별 필요 곡 수(1/3/8), 공연 점수 가중치. **기획서에 근거가 없으므로 승인 대상이다.**
- **밸런스 관찰(7주 플레이)**: 연습 위주로 짜면 2명 밴드의 체력이 0까지 떨어지고 스트레스가 77까지 오른다. 휴식을 섞지 않으면 계속 지친 상태로 공연하게 된다. 또한 첫 공연 전까지 수입원이 없어 자금이 한때 음수(₩-485K)가 된다. 둘 다 밸런스 수치 문제이며 임의로 조정하지 않았다.
- **곡 제목 어휘**: `TITLE_BY_TONE` / `TITLE_BY_ENERGY`는 VS 콘텐츠 자리표시자다. GDD §06의 "작사가와 상황에서 제목이 나온다"를 만족하려면 캐릭터별 작성 대사가 필요하다.
- **PHASE 2B 연결 지점**: `sim/song.ts`의 `relationshipContribution()`(현재 0 반환), `selectors.ts`의 `chemistryDiagnostics()`(현재 전 항목 '—' + 사유), 이벤트 엔진(현재 밴드명 이벤트만 스크립트).
- ~~합주 100% 곡 생성~~ / ~~녹음이 발매의 전제가 아님~~ 해결(곡 제작 v1).
- ~~공연 슬롯이 실제 공연과 분리~~ / ~~공연 보상 중 멤버 경험 미구현~~ / ~~홍보 반복 시 보상 1회~~ / ~~EP가 싱글로 기록됨~~ 해결(2026-09-19 연결 오류 수정).
- **공연 피로·경험치의 결과 연동 범위** (판단 필요): 현재 무대에 선 멤버에게 `LIVE_SHOW` 고정값(체력 −16 / 스트레스 +8 / 사기 +8 / 경험치 120)을 적용한다. 공연 등급이나 관객 수에 따라 달라져야 하는지는 기획서에 근거가 없어 임의로 만들지 않았다.
- **공연 제작비의 예상 지출 표시** (판단 필요): 제작비는 공연을 실제로 치른 시점에 청구되므로 일정 화면의 "예상 지출"에는 포함되지 않는다. 활동 카드에는 여전히 ₩50,000으로 표시된다.
- **공연 슬롯을 쓰고 무대에 오르지 않은 경우**: 슬롯만 소모되고 예약은 유지된다. 예약 만료·위약 규칙은 기획서에 없어 구현하지 않았다.
- **라이브 숙련도 (미결정 연결 지점)**: 합주 횟수는 `SongState.rehearsalCount`에 실제로 쌓이지만 **공연 점수에 연결하지 않았다.** 상승량·상한·점수 보정 계수가 결정안에 없어 임의로 만들지 않았고, UI도 "숙련도 수치는 아직 정해지지 않았다"라고만 표시한다. 수치가 정해지면 `sim/performance.ts`의 `performanceInputs`에 입력 한 줄을 더하면 된다.
- **녹음 품질 (미결정 연결 지점)**: 녹음은 현재 "발매 가능" 여부만 바꾼다(`recordedWeek`). 음원 품질 보정·녹음 실패·재녹음 개념은 결정안에 없어 구현하지 않았다. 수치가 생기면 `recordedWeek` 옆에 품질 필드를 더하고 `weeklyMusicIncome` / `songActions.release`에 연결하면 된다.
- **정규 앨범(ALBUM 8곡)**: 마스터 데이터와 상태(`RELEASED_ALBUM`)는 있으나 발매 UI는 없다. v1 범위에 싱글·EP만 명시되어 그대로 두었다.
- **녹음 대상이 사라진 경우**: 대상 곡을 고른 뒤 그 곡이 발매되면 녹음은 조용히 취소되고 비용도 청구되지 않는다. 경고·대체 선택 규칙은 결정안에 없어 만들지 않았다.
