// AUDITION (IA §12, Visual Bible Hero 02): real audition scene + Candidate Roster + Selected Candidate Quick Info.
// Actions: SHORTLIST / DETAIL / COMPARE. No contract button here.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, CONTRACT_PROFILES, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, StatBar, Tag, Todo } from '@/components/ui';

export function useOpenAudition() {
  const save = useSave();
  return Object.values(save.auditions).find((a) => a.status === 'OPEN') ?? null;
}

export function AuditionScreen() {
  const audition = useOpenAudition();
  const [params, setParams] = useSearchParams();
  const { go } = useGameNav();

  if (!audition || audition.candidateIds.length === 0) {
    return (
      <Panel title="AUDITION" nav="close">
        <EmptyState text="지금 열린 오디션이 없다." />
        <Todo>다음 오디션 생성(후보 4~6명, 등장 확률/내부 티어 기반)은 PHASE2. 현재는 첫 오디션 1회만 존재.</Todo>
      </Panel>
    );
  }

  const selectedId = (params.get('c') as CharacterId | null) && audition.candidateIds.includes(params.get('c') as CharacterId)
    ? (params.get('c') as CharacterId) : audition.candidateIds[0];
  const c = CHARACTERS[selectedId];
  const revealed = audition.revealedInformation[selectedId] ?? [];
  const shortlisted = audition.shortlistIds.includes(selectedId);
  const profile = CONTRACT_PROFILES[c.contractProfileId];
  const select = (id: CharacterId) => setParams({ c: id }, { replace: true });

  const compare = () => {
    auditionActions.setCompare(audition.auditionId, audition.shortlistIds.slice(0, 3));
    go('/audition/compare');
  };

  return (
    <Panel title="AUDITION" subtitle={`OPEN AUDITION · Candidates ${audition.candidateIds.length}`} nav="close" flush>
      {/* Audition scene: selected candidate performs in the room (World 60 / Decision UI 40) */}
      <div style={{ position: 'relative', height: 200, borderBottom: '1px solid var(--c-border)' }}>
        <PlaceholderAsset assetKey="AUDITION_ROOM_BG" variant="fill" />
        <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)' }}>
          <CharacterVisual id={selectedId} variant="FULL" />
        </div>
      </div>

      {/* Roster: all candidates visible at once (not Tinder-style) */}
      <div className="roster">
        {audition.candidateIds.map((id, i) => (
          <button key={id} className={`roster__card ${id === selectedId ? 'roster__card--selected' : ''}`} onClick={() => select(id)}>
            <span className="roster__idx">{String(i + 1).padStart(2, '0')}{audition.shortlistIds.includes(id) ? ' ★' : ''}</span>
            <CharacterVisual id={id} variant="THUMB" />
            <span className="roster__name">{CHARACTERS[id].name}</span>
            <span className="roster__pos">{CHARACTERS[id].positions[0].toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Selected Candidate Quick Info */}
      <div style={{ padding: '8px var(--gutter) 20px' }}>
        <div className="row row--between">
          <div>
            <div className="rowcard__title" style={{ fontSize: 16 }}>{c.name}</div>
            <div className="tags mt8">{c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}{revealed.includes('MUSIC_TAGS') && c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="xs dim">계약 부담</div>
            <div className="mono">{revealed.includes('CONTRACT_BURDEN') ? profile?.burden : '?'}</div>
          </div>
        </div>
        {revealed.includes('BASE_STATS') && (
          <div className="col mt12">
            <StatBar label="실력" value={c.visibleStats.skill} />
            <StatBar label="창의성" value={c.visibleStats.creative} />
            <StatBar label="무대력" value={c.visibleStats.stage} />
            <StatBar label="스타성" value={c.visibleStats.star} />
            <StatBar label="프로의식" value={c.visibleStats.pro} />
          </div>
        )}
        <div className="row mt12">
          <span className="xs dim">공개 특성</span>
          <span className="tags">
            {revealed.includes('TRAIT_1') && <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>}
            {revealed.includes('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
            {!revealed.includes('TRAIT_2') && <span className="xs faint">+ 아직 모르는 면</span>}
          </span>
        </div>
        <div className="row mt16" style={{ gap: 6 }}>
          <Btn variant={shortlisted ? 'primary' : 'secondary'} onClick={() => auditionActions.toggleShortlist(audition.auditionId, selectedId)}>{shortlisted ? '★ SHORTLISTED' : 'SHORTLIST'}</Btn>
          <Btn variant="secondary" onClick={() => go(`/audition/candidate/${selectedId}`)}>DETAIL</Btn>
          <Btn variant="secondary" disabled={audition.shortlistIds.length < 2} onClick={compare}>COMPARE {Math.min(3, audition.shortlistIds.length)}/3</Btn>
        </div>
        <Todo>Compare 인원(2~3명), Roster 카드 크기, Quick Info 높이는 Prototype Variable.</Todo>
      </div>
    </Panel>
  );
}
