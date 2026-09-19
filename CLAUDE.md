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

## 판단 필요 / TODO (문서에 없거나 모호한 항목)

- ~~Growth Curve 표기~~ 승인됨(PHASE 1.1): C05 = HIGH_START_SLOW, C13 = HIGH_START.
- ~~Lineup 슬롯 수~~ 해결(PHASE 1.1): 가변 슬롯 구조, VS 기본 core 4포지션. 추가 포지션 해금 조건은 PHASE 2+ 설계.
- ~~SaveData 추가 필드~~ 승인됨(PHASE 1.1): SaveData v1 정식 prototype 필드, schemaVersion 유지.
- **동일 포지션 중복 슬롯** (결정, PHASE 1.1 승인 시): 데이터 구조상 허용하되 Vertical Slice 초기 UI에서는 기본 core slots만 노출한다.
- **Synth / Producer 슬롯 규칙** (결정, PHASE 1.1 승인 시 — 아직 코드 미반영, 다음 작업 지시 때 적용):
  Synth는 KEYS 계열로 취급 가능. **Producer는 KEYS에 자동 매핑하지 않는다.** Producer는 별도 creative/production role이며,
  stage slot 배치는 해당 캐릭터가 Keys/Synth 포지션을 보유할 때만 가능하다.
  → 적용 시 `SLOT_DEFINITIONS.KEYS.compatiblePositions`에서 `'Producer'` 제거. 현재 15명 중 Producer 보유자는 C06 한예준(Keys / Producer)뿐이라 Keys로 KEYS 배치는 계속 가능하고, C13 나유안(Multi)은 Multi 규칙을 따른다. Producer의 creative/production role 시스템은 PHASE 2+.
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
