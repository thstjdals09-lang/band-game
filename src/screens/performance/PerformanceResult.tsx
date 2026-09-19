// PERFORMANCE RESULT (IA §20): 감정적 평가 -> 객관적 결과 -> 세계가 바뀐 결과 -> CONTINUE (Basecamp). Back locked.
import { useSave } from '@/state/store';
import { facilityAvailability } from '@/state/selectors';
import { useGameNav, useLockBack } from '@/app/navigation';
import { won } from '@/app/format';
import { Btn, EmptyState, Section } from '@/components/ui';

export function PerformanceResultScreen() {
  const save = useSave();
  const { go } = useGameNav();
  useLockBack(true);
  const snap = save.performanceHistory[save.performanceHistory.length - 1];
  if (!snap) return <div className="imm"><div className="imm__stage" style={{ padding: 16 }}><EmptyState text="공연 기록이 없다." action={<Btn variant="secondary" onClick={() => go('/', { replace: true })}>HOME</Btn>} /></div></div>;

  const newOpps = Object.values(save.opportunities).filter((o) => o.createdWeek === save.world.week && o.status === 'NEW');
  const recording = facilityAvailability(save, 'RECORDING_ROOM');

  return (
    <div className="imm">
      <div className="imm__top"><span>RESULT</span><span className="grow" /><span>{snap.venueName}</span></div>
      <div className="imm__stage" style={{ overflowY: 'auto', padding: '16px var(--gutter)' }}>
        <div className="big-grade">{snap.grade}</div>
        <div className="small dim">Opening · {snap.openingSongTitle}</div>

        <Section title="결과">
          <dl className="kv">
            <dt>Audience</dt><dd>{snap.audience}</dd>
            <dt>Revenue</dt><dd>+{won(snap.revenue)}</dd>
            <dt>Fans</dt><dd>+{snap.fansDelta}</dd>
            <dt>Reputation</dt><dd>{snap.reputationDelta >= 0 ? '+' : ''}{snap.reputationDelta}</dd>
          </dl>
        </Section>

        <Section title="세계가 바뀐 것">
          <ul className="col small">
            <li>· Trait 발견: 없음 <span className="faint">(TODO PHASE2)</span></li>
            <li>· 관계 변화: 없음 <span className="faint">(TODO PHASE2)</span></li>
            {newOpps.map((o) => <li key={o.id} className="accent">· 새 Opportunity · {o.title}</li>)}
            {recording === 'AVAILABLE' && <li className="amber">· 녹음실 건설 가능 (MANAGEMENT / FACILITIES)</li>}
            {snap.choices.map((c, i) => <li key={i} className="dim">· 순간 선택: {c.choiceId}</li>)}
          </ul>
        </Section>
        <p className="xs faint mt12">이 결과는 당시 수치로 Snapshot 저장되어 Career History에 보존된다.</p>
      </div>
      <div className="imm__bottom"><Btn variant="primary" full onClick={() => go('/', { replace: true })}>CONTINUE</Btn></div>
    </div>
  );
}
