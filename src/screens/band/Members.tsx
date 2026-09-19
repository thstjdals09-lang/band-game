// MEMBERS: 소속 멤버 전체와 개인 상태 (separate from LINEUP).
import { CHARACTERS } from '@/data/master';
import { useSave } from '@/state/store';
import { assignedCharacterIds, conditionWord } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Tag } from '@/components/ui';
import { BandFrame } from './BandFrame';

export function MembersScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const members = save.band.activeMembers;
  const assigned = assignedCharacterIds(save);

  return (
    <BandFrame>
      {members.length === 0 && (
        <EmptyState text="아직 영입한 멤버가 없다." action={<Btn variant="primary" onClick={() => go('/audition')}>오디션으로</Btn>} />
      )}
      {members.map((id) => {
        const c = CHARACTERS[id];
        const st = save.characterStates[id];
        const leader = save.band.officialLeaderCharacterId === id;
        return (
          <button key={id} className="rowcard rowcard--tap" onClick={() => go(`/band/members/${id}`)}>
            <CharacterVisual id={id} />
            <span className="grow">
              <span className="row" style={{ gap: 6 }}>
                <span className="rowcard__title">{c.name}</span>
                {leader && <Tag tone="amber">리더</Tag>}
                {!assigned.includes(id) && <Tag tone="mute">대기</Tag>}
              </span>
              <div className="rowcard__meta mt8">{c.positions.join(' / ')}</div>
              {st && <div className="rowcard__meta">체력 {conditionWord(st.condition.energy)} · 사기 {conditionWord(st.condition.morale)}</div>}
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        );
      })}
    </BandFrame>
  );
}
