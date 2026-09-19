// HOME / BASECAMP (IA §5). The world itself is rendered by AppShell's world layer (World 90 / UI 10).
// This screen only adds: Member Quick View sheet (?member=Cxx) and minimal alternative entry hints.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord, pendingVenueName } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { CharacterVisual } from '@/components/CharacterVisual';
import { BottomSheet, Btn, Tag } from '@/components/ui';

export function BasecampHomeScreen() {
  const save = useSave();
  const [params] = useSearchParams();
  const { go, back } = useGameNav();
  const memberId = params.get('member') as CharacterId | null;
  const member = memberId && CHARACTERS[memberId] ? CHARACTERS[memberId] : null;
  const state = memberId ? save.characterStates[memberId] : undefined;

  const noMembers = save.band.activeMembers.length === 0;
  const venue = pendingVenueName(save);

  return (
    <>
      {/* Alternative entry hints (IA §5: 중요한 오브젝트에는 명확한 알림 신호와 대체 진입 경로) */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {noMembers && (
          <button className="rowcard rowcard--tap" onClick={() => go('/audition')}>
            <span className="marker" style={{ position: 'static', animation: 'none' }}>!</span>
            <span className="grow" style={{ textAlign: 'left' }}>
              <div className="rowcard__title">첫 오디션이 열려 있다</div>
              <div className="rowcard__meta">후보 {Object.values(save.auditions)[0]?.candidateIds.length ?? 0}명 · AUDITION</div>
            </span>
            <span className="dim">→</span>
          </button>
        )}
        {venue && (
          <button className="rowcard rowcard--tap" onClick={() => go('/performance/prep')}>
            <span className="grow" style={{ textAlign: 'left' }}>
              <div className="rowcard__title">Debut Showcase · {venue}</div>
              <div className="rowcard__meta">공연 준비로 이동</div>
            </span>
            <span className="dim">→</span>
          </button>
        )}
      </div>

      {/* Member Quick View */}
      <BottomSheet open={!!member} title="MEMBER QUICK VIEW" onClose={back}>
        {member && (
          <div className="col">
            <div className="row">
              <CharacterVisual id={member.id} variant="BUST" />
              <div className="grow">
                <div className="rowcard__title">{member.name}</div>
                <div className="tags mt8">{member.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}</div>
                <div className="tags mt8">{member.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              </div>
            </div>
            {state && (
              <dl className="kv">
                <dt>체력</dt><dd>{conditionWord(state.condition.energy)}</dd>
                <dt>멘탈</dt><dd>{conditionWord(100 - state.condition.stress)}</dd>
                <dt>사기</dt><dd>{conditionWord(state.condition.morale)}</dd>
              </dl>
            )}
            <Btn variant="secondary" full onClick={() => go(`/band/members/${member.id}`)}>DETAIL</Btn>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
