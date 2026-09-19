// PERFORMANCE PREP (IA §18): Debut Showcase = Opening Song / Band Condition / Preparation / Equipment only.
import { CHARACTERS, VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord, lineupView, songList } from '@/state/selectors';
import { performanceActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Section, Tag, Todo } from '@/components/ui';

export function PerformancePrepScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const pending = save.pendingPerformance;
  if (!pending) {
    return <Panel title="PERFORMANCE PREP" nav="back"><EmptyState text="예정된 공연이 없다. Opportunity Inbox에서 공연 제안을 수락하라." action={<Btn variant="secondary" onClick={() => go('/inbox')}>INBOX</Btn>} /></Panel>;
  }
  const venue = VENUES[pending.venueId];
  const songs = songList(save);
  const lineup = lineupView(save).filter((s) => s.kind !== 'EMPTY');
  const ready = !!pending.openingSongId && lineup.length > 0;

  return (
    <Panel
      title="DEBUT SHOWCASE"
      subtitle={`${venue?.name ?? pending.venueId} · ${venue?.kind.replace('_', ' ')}`}
      nav="back"
      footer={<Btn variant="primary" full disabled={!ready} onClick={() => go('/performance/live')}>START SHOW</Btn>}
    >
      <Section title="Opening Song">
        {songs.length === 0 && <div className="warn">아직 곡이 없다. Practice / Recording 주간을 먼저 보내라.</div>}
        {songs.map((s) => (
          <button key={s.id} className={`rowcard rowcard--tap ${pending.openingSongId === s.id ? 'rowcard--selected' : ''}`} onClick={() => performanceActions.setOpeningSong(s.id)}>
            <span className="grow" style={{ textAlign: 'left' }}><div className="rowcard__title">{s.title}</div><div className="rowcard__meta">라이브 적합도 {s.musicProfile.liveFit}</div></span>
            {pending.openingSongId === s.id && <Tag tone="accent">OPENING</Tag>}
          </button>
        ))}
        <Todo>Full Setlist Editor는 곡이 충분히 쌓인 뒤 해금 (2곡/3곡 기준은 Prototype 검증 대상, IA §17).</Todo>
      </Section>
      <Section title="Band Condition">
        {lineup.length === 0 && <div className="warn warn--risk">라인업이 비어 있다.</div>}
        {lineup.map((s) => (
          <div key={s.slot} className="rowcard">
            <span className="slot__role">{s.label}</span>
            <span className="grow">{s.displayName}</span>
            <span className="xs dim">{s.characterId ? `체력 ${conditionWord(save.characterStates[s.characterId]?.condition.energy ?? 0)}` : '세션'}</span>
          </div>
        ))}
      </Section>
      <Section title="Preparation"><dl className="kv"><dt>준비도</dt><dd>보통</dd></dl><div className="xs faint">TODO(PHASE2): 연습 주간·곡 숙련도에서 계산</div></Section>
      <Section title="Equipment"><dl className="kv"><dt>장비</dt><dd>기본 장비</dd></dl><div className="xs faint">Equipment 시스템은 Shell (MANAGEMENT / EQUIPMENT)</div></Section>
      <div className="xs faint mt12">{lineup.map((s) => s.characterId ? CHARACTERS[s.characterId].name : 'SESSION').join(' · ')}</div>
    </Panel>
  );
}
