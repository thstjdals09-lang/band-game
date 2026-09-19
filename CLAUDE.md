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
- GitHub Pages 배포 워크플로 추가.

## 판단 필요 / TODO (문서에 없거나 모호한 항목)

- **Growth Curve 표기**: Character Master p.7은 C05·C13 모두 "HIGH START"로 축약하고 각주에 `HIGH_START_SLOW/HIGH_START`를 병기. 현재 C05=HIGH_START_SLOW, C13=HIGH_START로 가정. 확인 필요.
- **Lineup 슬롯 수**: IA §7 예시는 VOCAL/GUITAR/BASS/DRUMS 4슬롯, Visual Bible Hero 03은 5/5(키보드 포함). 현재 5슬롯(`LINEUP_SLOTS`).
- **SaveData 추가 필드**: 문서 SaveData 목록에 없지만 IA 구현에 필요해서 추가 — `band.lineup`(역할 배치), `auditions[].shortlistIds/compareIds`, `opportunities`(Inbox), `pendingPerformance`, `counters`. 스키마 v1에 포함할지 확인 필요.
- **계약 수치**: Contract burden/salary/duration은 placeholder. 문서 앵커는 윤하진 `$$`(Hero 02), C13 salary 900000뿐.
- **시작 수치**: Cash ₩3,000,000 / Fans 100 / Fame 10 (Hero 02 HUD 기준). IA 예시(₩420K / Fans 420 / W04)와 다름 — 밸런스 변수.
- **밴드 이름 이벤트**: IA §26의 "멤버 성향 기반 이름 제안"은 콘텐츠 생성이 필요해 placeholder 칩 + 자유 입력만 구현.
- **첫 공연 곡 수**: 현재 Week Resolution 1회로 데모 1곡 생성 → Debut Showcase는 1곡으로도 진행 가능. "최소 2곡" 템포는 Prototype 검증 대상(IA §17).
- **Performance 순간 선택 텍스트**: 사용자 지시의 민채린 솔로 예시를 GUITAR 슬롯 멤버 이름으로 치환해 사용. 실제 대사/이벤트 정의는 VS 콘텐츠 단계.
- **Display 폰트/아이콘**: 브러시·마커 계열 Display 폰트와 Dock 아이콘 에셋 없음 → 시스템 폰트 + 글자 placeholder.
- **팔레트 hex**: Visual Bible은 색을 이름으로만 정의 → `styles/tokens.css`의 hex는 근사값(Prototype Variable).
- **Dev Tools(`/dev`)**: IA에 없는 프로토타입 검수용 화면. 출시 빌드에서 제거 대상.
