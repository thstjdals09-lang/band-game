// FINANCE (IA §21): first screen = Cash / Expected Income / Expected Expense / Salary Burden only. Details one level deeper.
import { useState } from 'react';
import { useSave } from '@/state/store';
import { projectedExpense, weeklySalaryBurden } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { Btn, Section, Todo } from '@/components/ui';

export function FinanceScreen() {
  const save = useSave();
  const [details, setDetails] = useState(false);
  return (
    <Panel title="FINANCE" nav="back">
      <dl className="kv" style={{ fontSize: 14 }}>
        <dt>Cash</dt><dd>{won(save.economy.cash)}</dd>
        <dt>Expected Income</dt><dd>{save.pendingPerformance ? '공연 예정' : '—'}</dd>
        <dt>Expected Expense</dt><dd>{won(projectedExpense(save))}</dd>
        <dt>Salary Burden</dt><dd>{won(weeklySalaryBurden(save))} / 주</dd>
      </dl>
      <div className="mt12"><Btn variant="secondary" size="sm" onClick={() => setDetails((d) => !d)}>{details ? 'HIDE DETAILS' : 'DETAILS'}</Btn></div>
      {details && (
        <Section title="Ledger">
          {save.economy.ledger.length === 0 && <div className="xs faint">기록 없음</div>}
          {[...save.economy.ledger].reverse().map((l, i) => <div key={i} className="rowcard"><span className="mono xs dim">W{l.week}</span><span className="grow small">{l.label}</span><span className="mono small">{l.amount >= 0 ? '+' : ''}{won(l.amount)}</span></div>)}
        </Section>
      )}
      <Todo>Expected Income 계산(공연/음원/굿즈 단계 해금, GDD §05)은 PHASE2.</Todo>
    </Panel>
  );
}
