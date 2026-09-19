// FINANCE (IA §21): 첫 화면은 자금 / 예상 수입 / 예상 지출 / 급여 부담만. 상세는 한 단계 더.
import { useState } from 'react';
import { useSave } from '@/state/store';
import { projectedExpense, weeklySalaryBurden, weeklySessionCost } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { Btn, Section } from '@/components/ui';

export function FinanceScreen() {
  const save = useSave();
  const [details, setDetails] = useState(false);
  const expense = projectedExpense(save);

  return (
    <Panel title="자금" nav="back">
      <div className="rowcard rowcard--stack">
        <div className="label dim caps">보유 자금</div>
        <div className="big-grade" style={{ fontSize: 30, color: 'var(--c-text)' }}>{won(save.economy.cash)}</div>
      </div>

      <Section title="이번 주">
        <dl className="kv">
          <dt>예상 수입</dt><dd>{save.pendingPerformance ? '공연 예정' : '—'}</dd>
          <dt>예상 지출</dt><dd>{won(expense)}</dd>
          <dt>급여 부담</dt><dd>{won(weeklySalaryBurden(save))}</dd>
          <dt>세션 비용</dt><dd>{won(weeklySessionCost(save))}</dd>
        </dl>
      </Section>

      <div className="mt16">
        <Btn variant="secondary" full onClick={() => setDetails((d) => !d)}>{details ? '내역 접기' : '자세한 내역 보기'}</Btn>
      </div>

      {details && (
        <Section title="거래 내역">
          {save.economy.ledger.length === 0 && <div className="notice">아직 기록이 없다.</div>}
          {[...save.economy.ledger].reverse().map((l, i) => (
            <div key={i} className="rowcard">
              <span className="mono meta dim">{l.week}주</span>
              <span className="grow">{l.label}</span>
              <span className="mono meta" style={{ color: l.amount >= 0 ? 'var(--c-ok)' : 'var(--c-text)' }}>{l.amount >= 0 ? '+' : ''}{won(l.amount)}</span>
            </div>
          ))}
        </Section>
      )}
    </Panel>
  );
}
