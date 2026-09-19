// HOME / BASECAMP (IA §5). The world itself is rendered by AppShell's world layer (World 90 / UI 10).
// This screen adds only the Member Quick View sheet and the alternative entry hints for the
// most important unresolved thing right now.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord, debutSongRequirement, pendingVenueName, songWorkView, unreadOpportunityCount } from '@/state/selectors';
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
  const unread = unreadOpportunityCount(save);
  const req = debutSongRequirement(save);
  const work = songWorkView(save);
  // 멤버는 있는데 공연까지 곡이 모자란 구간. 지금 눌러야 할 한 가지를 알려준다.
  const buildingSongs = !noMembers && !venue && unread === 0 && !req.met;

  return (
    <>
      {/* Alternative entry for the current most important action (IA §5) */}
      <div className="homecta">
        {noMembers && (
          <button className="homecta__card" onClick={() => go('/audition')}>
            <span className="homecta__dot" />
            <span className="grow">
              <div className="rowcard__title">오디션이 열려 있다</div>
              <div className="rowcard__meta">후보 {Object.values(save.auditions)[0]?.candidateIds.length ?? 0}명을 만나본다</div>
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
        {venue && (
          <button className="homecta__card" onClick={() => go('/performance/prep')}>
            <span className="homecta__dot" />
            <span className="grow">
              <div className="rowcard__title">{venue} 공연이 잡혀 있다</div>
              <div className="rowcard__meta">{req.met ? '공연 준비로 이동' : `곡 ${req.have}/${req.required} · 준비가 더 필요하다`}</div>
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
        {buildingSongs && !work.newSong && (
          <button className="homecta__card" onClick={() => go('/band/songs')}>
            <span className="homecta__dot" />
            <span className="grow">
              <div className="rowcard__title">새 곡을 쓸 차례다</div>
              <div className="rowcard__meta">곡 {req.have}/{req.required} · 곡 화면에서 새 곡 작업을 예약한다</div>
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
        {buildingSongs && work.newSong && work.practiceSlots === 0 && (
          <button className="homecta__card" onClick={() => go('/schedule')}>
            <span className="homecta__dot" />
            <span className="grow">
              <div className="rowcard__title">합주를 잡아 데모를 만든다</div>
              <div className="rowcard__meta">곡 {req.have}/{req.required} · 새 곡 작업을 예약해 두었다</div>
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
        {!noMembers && !venue && unread > 0 && (
          <button className="homecta__card homecta__card--calm" onClick={() => go('/inbox')}>
            <span className="homecta__dot" />
            <span className="grow">
              <div className="rowcard__title">새 제안 {unread}건</div>
              <div className="rowcard__meta">전화와 책상 위에 메모가 남아 있다</div>
            </span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
      </div>

      {/* Member Quick View */}
      <BottomSheet open={!!member} title={member ? member.name : ''} onClose={back}>
        {member && (
          <div className="col">
            <div className="row row--top">
              <CharacterVisual id={member.id} variant="BUST" />
              <div className="grow col" style={{ gap: 8 }}>
                <div className="tags">{member.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}</div>
                <div className="tags">{member.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              </div>
            </div>
            {state && (
              <dl className="kv">
                <dt>체력</dt><dd>{conditionWord(state.condition.energy)}</dd>
                <dt>멘탈</dt><dd>{conditionWord(100 - state.condition.stress)}</dd>
                <dt>사기</dt><dd>{conditionWord(state.condition.morale)}</dd>
              </dl>
            )}
            <Btn variant="secondary" full onClick={() => go(`/band/members/${member.id}`)}>자세히 보기</Btn>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
