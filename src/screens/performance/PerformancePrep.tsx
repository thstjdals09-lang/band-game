// PERFORMANCE PREP (IA §18): Debut Showcase = Opening Song / Band Condition / Preparation / Equipment only.
// 첫 공연은 Opening Song 선택만. Full Setlist Editor는 이후 기능.
import { CHARACTERS, VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord, debutSongRequirement, lineupView, liveShowScheduled, playedShowThisWeek, songList } from '@/state/selectors';
import { preparedness } from '@/state/sim/performance';
import { performanceActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';

export function PerformancePrepScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const pending = save.pendingPerformance;

  if (!pending) {
    return (
      <Panel title="공연 준비" nav="back">
        <EmptyState text="예정된 공연이 없다. 들어온 제안을 수락하면 준비를 시작할 수 있다." action={<Btn variant="secondary" onClick={() => go('/inbox')}>제안 보기</Btn>} />
      </Panel>
    );
  }

  const venue = VENUES[pending.venueId];
  const songs = songList(save);
  const req = debutSongRequirement(save);
  const lineup = lineupView(save).filter((s) => s.kind !== 'EMPTY');
  // A show is a weekly activity: it takes one of the three band slots (IA §15).
  const scheduled = liveShowScheduled(save);
  const alreadyPlayed = playedShowThisWeek(save);
  const canStart = req.met && !!pending.openingSongId && lineup.length > 0 && scheduled && !alreadyPlayed;
  const ready = preparedness(save);
  const openingSong = songs.find((s) => s.id === pending.openingSongId);

  return (
    <Panel
      title="데뷔 쇼케이스"
      subtitle={`${venue?.name ?? pending.venueId} · 수용 ${venue?.capacity ?? '-'}명`}
      nav="back"
      footer={<Btn variant="primary" size="lg" full disabled={!canStart} onClick={() => go('/performance/live')}>공연 시작</Btn>}
    >
      <Section title={`오프닝 곡 · 보유 곡 ${req.have}/${req.required}`}>
        {!req.met && <Notice tone="risk">데뷔 쇼케이스에는 최소 {req.required}곡이 필요하다. 합주나 녹음으로 한 주를 더 보내자.</Notice>}
        {songs.map((s) => {
          const selected = pending.openingSongId === s.id;
          return (
            <button key={s.id} className={`rowcard rowcard--tap ${selected ? 'rowcard--selected' : ''}`} onClick={() => performanceActions.setOpeningSong(s.id)}>
              <span className="grow">
                <div className="rowcard__title">{s.title}</div>
                <div className="rowcard__meta">라이브 적합도 {s.musicProfile.liveFit}</div>
              </span>
              {selected ? <Tag tone="accent">오프닝</Tag> : <span className="rowcard__chev">›</span>}
            </button>
          );
        })}
        {req.met && !pending.openingSongId && <Notice tone="warn">첫 곡을 고르면 공연을 시작할 수 있다.</Notice>}
      </Section>

      {!scheduled && (
        <Section title="이번 주 일정">
          <Notice tone="warn">이번 주 일정에 공연을 넣어야 무대에 오를 수 있다.</Notice>
          <div className="mt12"><Btn variant="secondary" full onClick={() => go('/schedule')}>일정 짜러 가기</Btn></div>
        </Section>
      )}
      {alreadyPlayed && (
        <Section title="이번 주 일정">
          <Notice>이번 주 무대는 이미 끝났다. 다음 주 일정에 공연을 넣자.</Notice>
        </Section>
      )}

      <Section title="멤버 컨디션">
        {lineup.length === 0 && <Notice tone="risk">라인업이 비어 있다.</Notice>}
        {lineup.map((s) => (
          <div key={s.index} className="rowcard">
            <span className="slot__role" style={{ width: 56 }}>{s.label}</span>
            <span className="grow rowcard__title">{s.displayName}</span>
            <span className="rowcard__meta">
              {s.characterId ? `체력 ${conditionWord(save.characterStates[s.characterId]?.condition.energy ?? 0)}` : '세션'}
            </span>
          </div>
        ))}
      </Section>

      <Section title="준비 상태">
        <dl className="kv">
          <dt>준비도</dt><dd>{conditionWord(ready)}</dd>
          <dt>오프닝 라이브 적합도</dt><dd>{openingSong ? openingSong.musicProfile.liveFit : '-'}</dd>
          <dt>장비</dt><dd>기본 장비</dd>
        </dl>
        <Notice>준비도는 멤버의 체력·사기·스트레스에서 나온다. 공연 전 휴식과 연습이 결과를 바꾼다.</Notice>
      </Section>

      <div className="rowcard__meta mt16">
        무대에 서는 사람: {lineup.map((s) => (s.characterId ? CHARACTERS[s.characterId].name : '세션')).join(' · ')}
      </div>
    </Panel>
  );
}
