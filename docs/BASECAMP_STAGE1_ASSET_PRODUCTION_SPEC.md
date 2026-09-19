# BASECAMP STAGE 1 — ASSET PRODUCTION SPEC

이 문서는 **아트 제작자가 실제 이미지를 만들 때 지켜야 하는 규격**이다.
코드가 기대하는 계약은 `src/world/assets/contract.ts`, 좌표와 배치는 `src/world/maps/basecampStage1.ts`에 있다.

Source of Truth는 `docs/`의 PDF 4종이며, 시각 방향은 Visual Bible v1.0(고밀도 현대 HD 픽셀 · 고정 아이소메트릭)을 따른다.

> **PROTOTYPE RENDER VARIABLE**
> 아래의 **픽셀 수치는 확정 규격이 아니다.** 현재 프로토타입 렌더러가 쓰는 값이며 실제 아트 제작 단계에서 변경될 수 있다.
> 확정된 것은 **논리 구조**(그리드 좌표, footprint, anchor, depth anchor, state 목록)뿐이다.

---

## 1. Logical map size

| 항목 | 값 |
| --- | --- |
| 맵 논리 크기 | 13 × 8 tiles |
| Stage 1 바닥 | x 1–8, y 1–7 (56 tiles) |
| Stage 2 추가 바닥 | x 9–11, y 1–4 (12 tiles, 녹음실) |
| 벽 | 북쪽 y=0 (x 0–12), 서쪽 x=0 (y 1–7) |
| 카메라 프레이밍 범위 | Stage 1 `(0,0,10,8)` / Stage 2 `(0,0,13,8)` |

맵은 **모든 기기에서 동일**하다. 기기별로 오브젝트 좌표를 바꾸지 않는다. 달라지는 것은 카메라 zoom/offset뿐이다.

## 2. Isometric projection convention

- 2:1 다이아몬드, 고정 시점(회전 없음).
- `screenX = (x − y) × tileWidth / 2`
- `screenY = (x + y) × tileHeight / 2 − z × elevationHeight`
- +x는 화면 **오른쪽 아래**, +y는 화면 **왼쪽 아래**로 내려간다.
- 타일 (0,0)이 다이아몬드의 최상단(북쪽) 꼭짓점 쪽이다.

## 3. Tile orientation

- 바닥 타일 이미지는 **다이아몬드 한 장**으로 그린다(정사각형 top-down 아님).
- 다이아몬드의 좌우 꼭짓점이 이미지의 수평 중앙선에 오도록 한다.
- 벽은 **북쪽면 / 서쪽면 두 방향만** 필요하다(고정 시점이므로 남/동은 보이지 않는다).

## 4. Current prototype tile render dimensions — PROTOTYPE RENDER VARIABLE

| 항목 | 현재 값 | 비고 |
| --- | --- | --- |
| tileWidth | 128 px | 확정 아님 |
| tileHeight | 64 px | 2:1 유지가 조건, 절대값은 변경 가능 |
| elevationHeight (z 1단계) | 32 px | 확정 아님 |
| 캐릭터 높이 | 1.6 elevation unit ≈ 51 px | 4~4.5등신 기준, 확정 아님 |

**2:1 비율만 규칙이고 절대 픽셀 값은 아직 LOCK이 아니다.** 배수 변경 시 맵 데이터는 그대로 재사용된다.

## 5. Object footprint & anchor

footprint는 **바닥을 차지하는 타일 수**다. 이미지의 bounding box가 아니다.

| Object | footprint | anchor tile | depth anchor | interaction tile | height (unit) | 바닥 점유 |
| --- | --- | --- | --- | --- | --- | --- |
| NOTICE_BOARD | 2 × 1 | (3,0) | (4,0) | (3,1) | 1.2 | 없음(벽걸이) |
| EXIT_DOOR | 1 × 2 | (0,4) | (0,5) | (1,4) | 1.8 | 없음(벽걸이) |
| RECORDING_ROOM_ENTRANCE | 1 × 2 | (9,2) | (9,3) | (8,2) | 1.8 | 없음(벽걸이) |
| PRACTICE_ZONE | 4 × 3 | (2,2) | (5,4) | — | 0 | 없음(존 마커) |
| AMP_ZONE | 2 × 1 | (1,1) | (2,1) | — | 1.0 | 점유 |
| DRUM_ZONE | 2 × 2 | (4,1) | (5,2) | — | 1.2 | 점유 |
| SOFA | 2 × 1 | (2,6) | (3,6) | — | 0.8 | 점유 |
| PHONE_DESK | 2 × 1 | (7,6) | (8,6) | (7,5) | 0.9 | 점유 |
| RECORDING_DESK (Stage 2) | 2 × 1 | (10,1) | (11,1) | — | 0.9 | 점유 |

- **anchor tile** = footprint의 최소 x / 최소 y 코너.
- **sprite anchor** = 기본 `{ ax: 0.5, ay: 1 }`. 즉 스프라이트의 **가로 중앙 · 세로 바닥**이 anchor 타일 중심에 놓인다.
- **depth anchor** = 기본적으로 footprint의 가장 앞 타일(x+y 최대). 이 타일 기준으로 캐릭터와 앞뒤가 정렬된다.
- **interaction tile** = 플레이어가 상호작용할 때 쓰는 타일이자 추가 탭 영역. 바닥을 점유하지 않는다.

## 6. Required asset list

### 6.1 Floor tiles (1 × 1 다이아몬드)

| assetKey | 용도 |
| --- | --- |
| `TILE_FLOOR_CONCRETE` | 기본 바닥 |
| `TILE_FLOOR_RUG` | 합주 구역 러그 |
| `TILE_FLOOR_BOOTH` | 녹음실 바닥(Stage 2) |

### 6.2 Wall tiles

| assetKey | 용도 |
| --- | --- |
| `TILE_WALL_CONCRETE` | 북쪽면 / 서쪽면 (두 방향 변형 필요) |

### 6.3 Objects (state variant별 스프라이트)

| assetKey | state |
| --- | --- |
| `OBJ_NOTICE_BOARD_IDLE` / `OBJ_NOTICE_BOARD_AUDITION_AVAILABLE` | 평소 / 오디션 공고 |
| `OBJ_PHONE_DESK_IDLE` / `OBJ_PHONE_DESK_NOTIFICATION` | 평소 / 새 제안 |
| `OBJ_EXIT_DOOR_IDLE` | 출입문 |
| `OBJ_RECORDING_ROOM_ENTRANCE_LOCKED` / `_BUILDABLE` / `_BUILT` | 잠김 / 건설 가능 / 완성 |
| `OBJ_PRACTICE_ZONE_IDLE` | 러그 위 존 표시(없어도 됨) |
| `OBJ_SOFA_IDLE`, `OBJ_AMP_ZONE_IDLE`, `OBJ_DRUM_ZONE_IDLE`, `OBJ_RECORDING_DESK_IDLE` | 소품 |

### 6.4 Characters

- 키 규칙: `CHARACTER_<Cxx>_FULL` (월드용 전신), `_BUST`, `_THUMB`는 UI 파생.
- 세션 연주자: `SESSION_MUSICIAN_FULL`.
- 포즈 키: `idle` / `play` / `sit` / `talk` (애니메이션 프레임은 이번 범위 밖).

## 7. Required state variants

상태는 SaveData에서 계산되어 스프라이트를 교체한다. **아트가 상태를 결정하지 않는다.**

| Object | 상태 전환 근거 |
| --- | --- |
| PHONE_DESK | 읽지 않은 Opportunity 수 |
| NOTICE_BOARD | 열린 오디션 존재 여부 |
| RECORDING_ROOM_ENTRANCE | 시설 해금/건설 상태 (LOCKED → BUILDABLE → BUILT) |

## 8. Transparent padding convention

- 스프라이트는 **anchor 기준으로 잘라내고**, 여백은 투명으로 남긴다.
- 바닥 타일: 다이아몬드 외곽에 **2 px** 투명 패딩(타일 이음새 아티팩트 방지).
- 오브젝트: 좌우 각 **4 px**, 상단은 높이에 여유를 두고 하단은 **anchor 라인에 정확히 맞춘다**.
- 스프라이트를 임의로 트리밍해서 하단 기준선을 잃지 않는다. 기준선이 곧 depth anchor다.

## 9. Depth anchor convention

- 드로우 순서는 `(x + y)` 기준 painter's algorithm이다.
- 같은 타일에서는 **벽 → 오브젝트 → 캐릭터** 순으로 그려진다.
- 키 큰 소품은 앞 타일(depth anchor)에 정렬되므로, **스프라이트 하단이 그 타일의 중심에 오도록** 그린다.
- 캐릭터가 소파 뒤 타일에 서면 소파가 캐릭터를 가린다. 소품 상단이 잘리지 않도록 세로 여유를 둔다.

## 10. Character scale guide

- 4~4.5등신, 높이 약 **1.6 elevation unit**(현재 값 기준 약 51 px).
- 캐릭터는 한 타일(1 × 1) 안에 서며 바닥 점유는 하지 않는다.
- 얼굴 디테일보다 **실루엣 · 헤어 · 의상 · 악기**로 구분되어야 한다(Visual Bible §05).

## 11. Safe object height

- 오브젝트 높이는 **2.0 elevation unit 이하**를 권장한다. 그 이상은 뒤쪽 캐릭터를 과도하게 가린다.
- 벽 높이는 현재 **2.4 unit**이며 카메라 상단 여백 계산에 반영된다.
- 높이를 바꾸면 `ObjectDefinition.heightUnits`도 함께 갱신해야 한다.

## 12. Floor / wall asset categories

| 카테고리 | 교체 단위 | 비고 |
| --- | --- | --- |
| Floor | 타일 1장 | 재질별(CONCRETE / RUG / BOOTH) |
| Wall | 면(북/서) 1장 | 높이는 `heightUnits`로 제어 |
| Object | 오브젝트 · 상태별 1장 | footprint와 anchor 준수 |
| Character | 캐릭터 · 포즈별 1장 | 전신이 Source of Truth |

**한 장짜리 방 배경 이미지는 만들지 않는다.** 바닥 · 벽 · 오브젝트 · 캐릭터는 교체 가능한 개별 자산이어야 Stage 1 → Stage 2 부분 확장이 성립한다.

## 13. 반입 절차

1. 스프라이트를 `src/assets/` 아래에 추가한다.
2. `src/assets/registry.ts`에서 해당 `assetKey`의 값을 `null` → 이미지 URL로 바꾼다.
3. 코드 수정 없이 디버그 블록이 실제 아트로 교체된다.
4. `/dev/world`(ISOMETRIC WORLD LAB)에서 footprint · depth · 카메라를 재확인한다.
