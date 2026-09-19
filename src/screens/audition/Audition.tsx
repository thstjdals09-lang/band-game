// AUDITION (IA §12): real audition scene + Candidate Roster + Selected Candidate Quick Info.
// Actions: SHORTLIST / DETAIL / COMPARE. No contract button here.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, CONTRACT_PROFILES, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, StatBar, Tag } from '@/components/ui';

export function AuditionScreen() {
  const save = useSave();
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN') ?? null;
  const [params, setParams] = useSearchParams();
  const { go } = useGameNav();

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
  const shortlisted = audition.shortlistIds.includes(selectedId);
  const profile = CONTRACT_PROFILES[c.contractProfileId];
  const select = (id: CharacterId) => setParams({ c: id }, { replace: true });

  const compare = () => {
    auditionActions.setCompare(audition.auditionId, audition.shortlistIds.slice(0, 3));
    go('/audition/compare');
  };

  return (
    <Panel title="오디션" subtitle={`후보 ${audition.candidateIds.length}명`} nav="close" flush>
      {/* Audition scene: selected candidate performs in the room (World 60 / Decision UI 40) */}
      <div style={{ position: 'relative', height: 190, borderBottom: '1px solid var(--c-border)' }}>
        <PlaceholderAsset assetKey="AUDITION_ROOM_BG" variant="fill" kind="scene" />
        <div style={{ position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)' }}>
          <CharacterVisual id={selectedId} variant="FULL" />
        </div>
      </div>

      {/* Roster: all candidates visible at once (not Tinder-style) */}
      <div className="roster">
        {audition.candidateIds.map((id) => (
          <button key={id} className={`roster__card roster__wrap ${id === selectedId ? 'roster__card--selected' : ''}`} onClick={() => select(id)}>
            {audition.shortlistIds.includes(id) && <span className="roster__star">★</span>}
            <CharacterVisual id={id} variant="THUMB" />
            <span className="roster__name">{CHARACTERS[id].name}</span>
            <span className="roster__pos">{CHARACTERS[id].positions[0].toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Selected Candidate Quick Info */}
      <div style={{ padding: '10px var(--gutter) 24px' }}>
        <div className="row row--between row--top">
          <div className="grow">
            <div className="panel__title">{c.name}</div>
            <div className="tags mt8">
              {c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}
              {revealed.includes('MUSIC_TAGS') && c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="label dim">계약 부담</div>
            <div className="mono lead strong">{revealed.includes('CONTRACT_BURDEN') ? profile?.burden : '?'}</div>
          </div>
        </div>

        {revealed.includes('BASE_STATS') && (
          <div className="col mt16" style={{ gap: 9 }}>
            <StatBar label="실력" value={c.visibleStats.skill} />
            <StatBar label="창의성" value={c.visibleStats.creative} />
            <StatBar label="무대력" value={c.visibleStats.stage} />
            <StatBar label="스타성" value={c.visibleStats.star} />
            <StatBar label="프로의식" value={c.visibleStats.pro} />
          </div>
        )}

        <div className="tags mt16">
          {revealed.includes('TRAIT_1') && <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>}
          {revealed.includes('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
          {!revealed.includes('TRAIT_2') && <Tag tone="mute">아직 모르는 면이 있다</Tag>}
        </div>

        <div className="col mt20" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <Btn variant={shortlisted ? 'primary' : 'secondary'} full onClick={() => auditionActions.toggleShortlist(audition.auditionId, selectedId)}>
              {shortlisted ? '★ 쇼트리스트' : '쇼트리스트'}
            </Btn>
            <Btn variant="secondary" full onClick={() => go(`/audition/candidate/${selectedId}`)}>상세 보기</Btn>
          </div>
          <Btn variant="ghost" full disabled={audition.shortlistIds.length < 2} onClick={compare}>
            {audition.shortlistIds.length < 2 ? '비교하려면 2명 이상 쇼트리스트' : `비교하기 (${Math.min(3, audition.shortlistIds.length)}명)`}
          </Btn>
        </div>
      </div>
    </Panel>
  );
}
