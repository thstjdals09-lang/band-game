// AUDITION (IA §12, Visual Bible §08 — AUDITION은 World 60 / Decision UI 40)
//
// 레이어 구조가 이 화면의 핵심이다.
//   배경 장면  →  그 위에 떠 있는 카드 한 장  →  카드 안의 하위 패널 둘(후보 스트립 / 수치)
// 인물 영역은 박스를 두르지 않는다. 카드 위에 바로 올라가 화면의 중심이 된다.
// 박스를 여러 장 쌓으면 장면이 사라지고 관리 앱처럼 보인다.
//
// 읽는 순서: 후보를 훑고 → 한 명을 고르면 → 그 사람이 가운데를 차지하고 → 강점·수치 → 결정.
// 긴 설명과 조사 행동은 '상세 보기'가 맡는다. 표시하는 것은 전부 이미 공개된 정보다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, characterQuote, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { candidateFieldView } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { resolveAsset } from '@/assets/registry';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Tag, positionTone } from '@/components/ui';
import { FieldStats, RosterStrip } from './parts';

export function AuditionScreen() {
  const save = useSave();
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN') ?? null;
  const [params, setParams] = useSearchParams();
  const { go, closeToHome } = useGameNav();

  if (!audition || audition.candidateIds.length === 0) {
    return (
      <Panel title="오디션" nav="close">
        <EmptyState text="지금 열린 오디션이 없다. 다음 오디션이 열리면 게시판에 공고가 붙는다." />
      </Panel>
    );
  }

  const param = params.get('c') as CharacterId | null;
  const selectedId = param && audition.candidateIds.includes(param) ? param : audition.candidateIds[0];
  const c = CHARACTERS[selectedId];
  const revealed = audition.revealedInformation[selectedId] ?? [];
  const select = (id: CharacterId) => setParams({ c: id }, { replace: true });

  // 후보가 한 화면을 넘으면 좌우 버튼으로 한 쪽씩 넘긴다. 잘린 카드가 남지 않는다.
  const listRef = useRef<HTMLDivElement>(null);
  // mid = 버튼을 놓을 높이. 카드 줄이 바뀌어도 항상 카드의 세로 한가운데에 온다.
  const [nav, setNav] = useState({ left: false, right: false, mid: 0 });
  const syncNav = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const wrap = el.closest('.aud__rosternav') as HTMLElement | null;
    const mid = wrap
      ? el.getBoundingClientRect().top - wrap.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
      : 0;
    setNav({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2, mid });
  }, []);
  useEffect(() => {
    syncNav();
    const el = listRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', syncNav, { passive: true });
    window.addEventListener('resize', syncNav);
    return () => { el.removeEventListener('scroll', syncNav); window.removeEventListener('resize', syncNav); };
  }, [syncNav, audition.candidateIds.length]);
  // 한 번에 한 장씩. 1·2·3·4 에서 오른쪽을 누르면 2·3·4·5 가 된다.
  const page = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelector('.roster__card') as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap || '6') || 6;
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const quote = characterQuote(selectedId);
  const view = candidateFieldView(save, audition.auditionId, selectedId);

  // 다른 후보와 견줘 돋보이는 점 둘. 자세한 비교는 '비교하기'와 '상세 보기'가 맡는다.
  const badges = view.standouts.slice(0, 2);

  // 이 후보의 장면 일러스트가 있으면 카드 뒤에 깐다. 없으면 기존 배경이 그대로 보인다.
  const sceneUrl = resolveAsset(`CHARACTER_${selectedId}_SCENE`) ?? undefined;
  // 후보를 바꿀 때 장면이 툭 끊기지 않게, 이전 그림을 한 겹 남겨 겹쳐 넘긴다.
  const [scene, setScene] = useState<{ prev?: string; cur?: string; k: number }>({ cur: sceneUrl, k: 0 });
  useEffect(() => {
    setScene((p) => (p.cur === sceneUrl ? p : { prev: p.cur, cur: sceneUrl, k: p.k + 1 }));
  }, [sceneUrl]);
  // 새 그림이 다 올라오면 아래 그림을 치운다. 그 전까지는 100%로 깔려 있어 뒤가 비치지 않는다.
  useEffect(() => {
    if (!scene.prev) return undefined;
    const t = window.setTimeout(() => setScene((p) => ({ ...p, prev: undefined })), 460);
    return () => window.clearTimeout(t);
  }, [scene.k, scene.prev]);

  return (
    <Panel
      title="오디션"
      subtitle={`후보 ${audition.candidateIds.length}명`}
      nav="close"
      flush
      scene
      hideHeader
      background={(scene.prev || scene.cur) ? (
        <div className="aud__scene" aria-hidden>
          {/* 위에 새 그림이 올라오는 동안에는 100%로 버틴다. 올라올 그림이 없을 때만 서서히 걷는다. */}
          {scene.prev && (
            <img
              key={`p${scene.k}`}
              className={scene.cur ? 'aud__scene__hold' : 'aud__scene__out'}
              src={scene.prev}
              alt=""
            />
          )}
          {scene.cur && <img key={`c${scene.k}`} className="aud__scene__in" src={scene.cur} alt="" />}
        </div>
      ) : undefined}
    >
      <div className="aud">
          {/* 좌우 버튼은 그룹 바깥에서 그룹 폭을 넘어 걸친다 */}
          <div className="aud__rosternav">
          <div className="aud__group">
            <div className="aud__head">
              <button className="panel__nav" onClick={closeToHome} aria-label="close">×</button>
              <div className="grow">
                <div className="panel__title">오디션</div>
                <div className="panel__sub">후보 {audition.candidateIds.length}명</div>
              </div>
            </div>
            <RosterStrip audition={audition} selectedId={selectedId} onSelect={select} listRef={listRef} />
          </div>
          {nav.left && (
            <button className="rosternav rosternav--prev" style={{ top: nav.mid }} aria-label="이전 후보" onClick={() => page(-1)}>‹</button>
          )}
          {nav.right && (
            <button className="rosternav rosternav--next" style={{ top: nav.mid }} aria-label="다음 후보" onClick={() => page(1)}>›</button>
          )}
          </div>

          {/* 고정된 상단 블록 아래에서 시작하는 영역. 여기만 스크롤된다. */}
          <div className="aud__scroll">
          {/* 화면의 중심. 박스를 두르지 않는다.
              인물은 배경 일러스트가 보여주므로 전신 픽셀 스프라이트는 여기에 두지 않는다.
              픽셀 초상은 위 후보 스트립에만 남는다. */}
          <div className="aud__hero">
            <div className="aud__id">
              <h2 className="aud__name">{c.name}</h2>
              <div className="tags">
                {c.positions.map((p) => <Tag key={p} tone={positionTone(p)}>{p.toUpperCase()}</Tag>)}
              </div>
              {revealed.includes('MUSIC_TAGS') && (
                <div className="tags">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              )}
              <div className="tags">
                {revealed.includes('TRAIT_1') && <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>}
                {revealed.includes('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
                {!revealed.includes('TRAIT_2') && <Tag tone="mute">아직 모르는 면이 있다</Tag>}
              </div>
              {/* 수치가 아니라 사람이 먼저 읽히게, 이 자리는 한마디가 맡는다.
                  계약 부담은 상세 보기와 계약 협상에서 그대로 확인할 수 있다. */}
              {quote && <p className="aud__quote">“ {quote} ”</p>}
            </div>
          </div>

          {/* 하나의 투명 상자 — 강점 · 수치 · 결정을 묶는다 */}
          <div className="aud__panel">
            <div className="aud__badges">
              <span className="aud__among">후보 {view.fieldSize}명 중</span>
              {badges.map((t) => <span key={t} className="badge">{t}</span>)}
            </div>
            {revealed.includes('BASE_STATS') && <FieldStats view={view} compact legend={false} />}
            <div className="aud__foot">
              <span className="fstats__legend"><span className="fstats__tick" /> 이번 오디션 후보 평균</span>
            </div>

            {/* 결정 — 주 버튼 하나 + 보조 둘 */}
            {/* 쇼트리스트와 비교 기능은 그대로 두고 이 화면에서만 감춘다. */}
            <div className="aud__actions">
              <div className="row" style={{ gap: 8 }}>
                <Btn variant="secondary" full onClick={() => go(`/audition/candidate/${selectedId}`)}>상세 보기</Btn>
                <Btn variant="primary" full onClick={() => go(`/audition/contract/${selectedId}`)}>계약 협상</Btn>
              </div>
            </div>
          </div>
          </div>
      </div>
    </Panel>
  );
}
