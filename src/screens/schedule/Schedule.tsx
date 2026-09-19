// SCHEDULE (IA §15, SOFT LOCK): 주 단위 + Main Action Slot 3 + Individual Action 1~2 + NEXT WEEK.
// Shows projected expense and condition / risk warnings before NEXT WEEK.
import { useSearchParams } from 'react-router-dom';
import { ACTIVITIES, CHARACTERS, type IndividualActionId, type MainActionId } from '@/data/master';
import { useSave } from '@/state/store';
import { projectedExpense, scheduleWarnings } from '@/state/selectors';
import { scheduleActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won, yearWeekLong } from '@/app/format';
import { Panel } from '@/components/Panel';
import { BottomSheet, Btn, Section, Todo } from '@/components/ui';

const MAIN = ACTIVITIES.filter((a) => a.scope === 'BAND');
const IND = ACTIVITIES.filter((a) => a.scope === 'INDIVIDUAL');

export function ScheduleScreen() {
  const save = useSave();
  const [params, setParams] = useSearchParams();
  const { go, back } = useGameNav();
  const plan = save.weeklyPlan;
  const expense = projectedExpense(save);
  const warnings = scheduleWarnings(save);
  const hasMembers = save.band.activeMembers.length > 0;
  const hasAction = plan.mainActions.some(Boolean);

  const pick = params.get('pick'); // "main:0" | "ind:0"
  const open = (v: string) => setParams({ pick: v });

  const mainName = (id: MainActionId | null) => MAIN.find((a) => a.id === id)?.name;

  return (
    <Panel
      title="SCHEDULE"
      subtitle={yearWeekLong(save)}
      nav="close"
      footer={
        <div className="col" style={{ width: '100%' }}>
          {!hasMembers && <div className="xs dim">멤버가 없으면 주간을 진행할 수 없다. 먼저 오디션에서 영입하라.</div>}
          <Btn variant="primary" full disabled={!hasMembers || !hasAction} onClick={() => go('/schedule/resolution')}>NEXT WEEK ▶</Btn>
        </div>
      }
    >
      <Section title="MAIN ACTIONS · 3">
        {plan.mainActions.map((a, i) => (
          <button key={i} className="actionslot" onClick={() => open(`main:${i}`)}>
            <span className="actionslot__n">{i + 1}</span>
            <span style={{ textAlign: 'left' }}>{a ? <b>{mainName(a)}{a === 'LIVE_SHOW' && save.pendingPerformance ? ` · ${save.pendingPerformance.venueId}` : ''}</b> : <span className="actionslot__empty">+ 선택</span>}</span>
          </button>
        ))}
      </Section>

      <Section title="INDIVIDUAL · 1~2">
        {plan.individualActions.map((ia, i) => (
          <button key={i} className="actionslot" onClick={() => open(`ind:${i}`)}>
            <span className="actionslot__n">·</span>
            <span style={{ textAlign: 'left' }}><b>{CHARACTERS[ia.characterId].name}</b> · {IND.find((x) => x.id === ia.actionId)?.name}</span>
          </button>
        ))}
        {plan.individualActions.length < 2 && (
          <button className="actionslot" onClick={() => open(`ind:${plan.individualActions.length}`)} disabled={!hasMembers}>
            <span className="actionslot__n">+</span><span className="actionslot__empty" style={{ textAlign: 'left' }}>개인 일정 추가</span>
          </button>
        )}
      </Section>

      <Section title="진행 전 확인">
        <dl className="kv"><dt>Projected Expense</dt><dd>{won(expense)}</dd><dt>Cash</dt><dd>{won(save.economy.cash)}</dd></dl>
        <div className="mt8">
          {warnings.map((w, i) => <div key={i} className={`warn ${w.level === 'RISK' ? 'warn--risk' : ''}`}>{w.level === 'RISK' ? 'Risk' : 'Warning'}: {w.text}</div>)}
          {warnings.length === 0 && <div className="xs faint">경고 없음</div>}
        </div>
      </Section>
      <Todo>Main Action 2칸/가변형 여부, 기회 카드 혼합은 플레이테스트 후 결정 (IA §28).</Todo>

      <BottomSheet open={!!pick} title={pick?.startsWith('main') ? 'MAIN ACTION' : 'INDIVIDUAL ACTION'} onClose={back}>
        {pick?.startsWith('main') && (
          <div className="col">
            {MAIN.map((a) => {
              const live = a.id === 'LIVE_SHOW';
              const disabled = live && !save.pendingPerformance;
              return (
                <Btn key={a.id} full variant="secondary" disabled={disabled} onClick={() => { scheduleActions.setMainAction(Number(pick.split(':')[1]), a.id as MainActionId); back(); }}>
                  {a.name}{disabled ? ' · 예정된 공연 없음' : ''}{a.cost ? ` · ${won(a.cost)}` : ''}
                </Btn>
              );
            })}
            <Btn full variant="ghost" onClick={() => { scheduleActions.setMainAction(Number(pick.split(':')[1]), null); back(); }}>비우기</Btn>
            <div className="xs faint">Live Show는 Opportunity를 수락한 뒤 선택 가능. 프로토타입에서는 Performance Prep에서 바로 공연으로 진행할 수도 있다.</div>
          </div>
        )}
        {pick?.startsWith('ind') && <IndividualPicker index={Number(pick.split(':')[1])} onDone={back} />}
      </BottomSheet>
    </Panel>
  );
}

function IndividualPicker({ index, onDone }: { index: number; onDone: () => void }) {
  const save = useSave();
  const [params, setParams] = useSearchParams();
  const member = params.get('m');
  if (!member) {
    return (
      <div className="col">
        <div className="xs dim">멤버 선택</div>
        {save.band.activeMembers.map((id) => <Btn key={id} full variant="secondary" onClick={() => setParams({ pick: `ind:${index}`, m: id }, { replace: true })}>{CHARACTERS[id].name}</Btn>)}
        {save.weeklyPlan.individualActions[index] && <Btn full variant="ghost" onClick={() => { scheduleActions.setIndividualAction(index, null); onDone(); }}>삭제</Btn>}
      </div>
    );
  }
  return (
    <div className="col">
      <div className="xs dim">{CHARACTERS[member as keyof typeof CHARACTERS]?.name} · 행동 선택</div>
      {IND.map((a) => (
        <Btn key={a.id} full variant="secondary" onClick={() => { scheduleActions.setIndividualAction(index, { characterId: member as never, actionId: a.id as IndividualActionId }); onDone(); }}>{a.name}{a.cost ? ` · ${won(a.cost)}` : ''}</Btn>
      ))}
    </div>
  );
}
