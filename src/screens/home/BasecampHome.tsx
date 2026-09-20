// HOME / BASECAMP (IA §5). The world itself is rendered by AppShell's world layer (World 90 / UI 10).
// This screen adds only the Member Quick View sheet and the alternative entry hints for the
// most important unresolved thing right now.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { worldActions } from '@/state/actions';
import { characterPoseSlots } from '@/assets/registry';
import { conditionWord, debutSongRequirement, pendingVenueName, songWorkView, unreadOpportunityCount } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { CharacterVisual } from '@/components/CharacterVisual';
import { BottomSheet, Btn, Tag } from '@/components/ui';

export function BasecampHomeScreen() {
  const save = useSave();
  const [params, setParams] = useSearchParams();
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

  // 인물 배치 모드. 월드에서 사람을 고르고 바닥 타일을 누르면 그 자리에 선다.
  const placing = params.get('place') === '1';
  const who = params.get('who');
  const whoName = who ? (CHARACTERS[who as CharacterId]?.name ?? '세션') : null;
  const placed = save.worldPlacements ?? {};

  // 자세는 멤버에게만 있다. 그림이 없는 자리는 눌리지 않는다.
  const poseSlots = who && CHARACTERS[who as CharacterId] ? characterPoseSlots(who) : [];
  const currentPose = who ? placed[who]?.pose : undefined;

  if (placing) {
    return (
      <div className="homeplace">
        {who && poseSlots.length > 0 && (
          <div className="poses">
            <button
              className={`poses__chip ${!currentPose ? 'poses__chip--on' : ''}`}
              onClick={() => worldActions.setPose(who, undefined)}
            >
              기본
            </button>
            {poseSlots.map((slot) => (
              <button
                key={slot.name}
                className={`poses__chip ${currentPose === slot.name ? 'poses__chip--on' : ''}`}
                disabled={!slot.ready}
                onClick={() => worldActions.setPose(who, slot.name)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
        <div className="homeplace__bar">
          <span className="grow">{whoName ?? '옮길 사람을 고르세요'}</span>
          {who && placed[who] && (
            <Btn size="sm" variant="ghost" onClick={() => worldActions.reset(who)}>되돌리기</Btn>
          )}
          <Btn size="sm" variant="secondary" onClick={() => setParams({}, { replace: true })}>완료</Btn>
        </div>
        <div className="homeplace__hint">
          {who ? '바닥 타일을 누르면 그 자리에 선다.' : '월드에서 옮길 사람을 누르세요.'}
        </div>
      </div>
    );
  }

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
        {!noMembers && (
          <button className="homeplace__enter" onClick={() => setParams({ place: '1' }, { replace: true })}>
            인물 배치
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
