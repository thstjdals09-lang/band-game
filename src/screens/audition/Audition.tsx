// AUDITION (IA §12): Candidate Roster + 선택한 후보의 큰 비주얼 + Quick Info.
// Actions: SHORTLIST / DETAIL / COMPARE. No contract button here.
//
// 후보를 "고르는" 화면이다. 다섯 명이 한눈에 구분되도록 로스터 카드마다 그 사람의 가장 높은 스탯을 붙이고,
// 선택한 후보의 스탯은 다른 후보와 견줘서 보여준다 (세로선 = 후보 평균, 1위 = 후보 중 최고).
// 표시하는 것은 전부 이미 공개된 정보다.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, CONTRACT_PROFILES, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { candidateFieldView, candidateFit } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Tag } from '@/components/ui';
import { FieldStats, RosterStrip, StandoutChips } from './parts';

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

  const view = candidateFieldView(save, audition.auditionId, selectedId);
  const fit = candidateFit(save, selectedId);
  const hasBand = save.band.activeMembers.length > 0;
  const shortCount = audition.shortlistIds.length;

  const compare = () => {
    auditionActions.setCompare(audition.auditionId, audition.shortlistIds.slice(0, 3));
    go('/audition/compare');
  };

  return (
    <Panel title="오디션" subtitle={`후보 ${audition.candidateIds.length}명`} nav="close" flush>
      {/* Roster: 후보 전원이 한 줄에 보인다 (한 명씩 넘기는 구조가 아니다) */}
      <RosterStrip save={save} audition={audition} selectedId={selectedId} onSelect={select} />

      {/* 선택한 후보: 큰 비주얼 + 누구인지 */}
      <div className="ahero">
        <PlaceholderAsset assetKey="AUDITION_ROOM_BG" variant="fill" kind="scene" />
        <div className="ahero__visual"><CharacterVisual id={selectedId} variant="FULL" /></div>
        <div className="ahero__id">
          <div className="ahero__name">{c.name}</div>
          <div className="tags">
            {c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}
          </div>
          {revealed.includes('MUSIC_TAGS') && (
            <div className="tags">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          )}
          <div className="tags">
            {revealed.includes('TRAIT_1') && <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>}
            {revealed.includes('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
            {!revealed.includes('TRAIT_2') && <Tag tone="mute">아직 모르는 면이 있다</Tag>}
          </div>
          <div className="ahero__burden">
            <span className="label dim">계약 부담</span>
            <span className="mono lead strong">{revealed.includes('CONTRACT_BURDEN') ? profile?.burden : '?'}</span>
          </div>
        </div>
      </div>

      <div className="abody">
        {/* 다른 후보와 견줘 돋보이는 점 + 지금 밴드에서 설 자리 */}
        <StandoutChips view={view} />
        <ul className="afit">
          <li className={fit.fillsSlotLabel ? 'afit__ok' : ''}>
            {fit.fillsSlotLabel
              ? `비어 있는 ${fit.fillsSlotLabel} 자리에 바로 설 수 있다`
              : '지금 비어 있는 자리 중에는 맞는 포지션이 없다'}
          </li>
          {hasBand && revealed.includes('MUSIC_TAGS') && (
            <li className={fit.sharedTags.length > 0 ? 'afit__ok' : ''}>
              {fit.sharedTags.length > 0
                ? `지금 밴드와 겹치는 장르 · ${fit.sharedTags.join(', ')}`
                : '지금 밴드와 겹치는 장르가 없다'}
            </li>
          )}
        </ul>

        {revealed.includes('BASE_STATS') && <FieldStats view={view} />}

        <div className="col mt16" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <Btn variant={shortlisted ? 'primary' : 'secondary'} full onClick={() => auditionActions.toggleShortlist(audition.auditionId, selectedId)}>
              {shortlisted ? '★ 쇼트리스트' : '쇼트리스트'}
            </Btn>
            <Btn variant="secondary" full onClick={() => go(`/audition/candidate/${selectedId}`)}>상세 보기</Btn>
          </div>
          <Btn variant="ghost" full disabled={shortCount < 2} onClick={compare}>
            {shortCount < 2 ? '비교하려면 2명 이상 쇼트리스트' : `비교하기 (${Math.min(3, shortCount)}명)`}
          </Btn>
          <div className="ahint">
            {shortCount === 0 && '마음에 드는 후보를 쇼트리스트에 담아 두면 나란히 놓고 비교할 수 있다.'}
            {shortCount === 1 && '한 명 더 담으면 두 사람을 나란히 비교할 수 있다.'}
            {shortCount >= 2 && `★ 표시가 붙은 ${shortCount}명을 담아 두었다.`}
          </div>
        </div>
      </div>
    </Panel>
  );
}
