// SCHEDULE (IA §15, SOFT LOCK): 주 단위 + Main Action Slot 3 + Individual Action 1~2 + NEXT WEEK.
// Each action slot reads as a choice: 이름 / 설명 / 영향 / 비용.
import { useSearchParams } from 'react-router-dom';
import { ACTIVITIES, CHARACTERS, VENUES, type IndividualActionId, type MainActionId } from '@/data/master';
import { useSave } from '@/state/store';
import { activityUnlocked, projectedExpense, scheduleWarnings } from '@/state/selectors';
import { scheduleActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won, yearWeekLong } from '@/app/format';
import { Panel } from '@/components/Panel';
import { BottomSheet, Btn, Notice, Section, Tag } from '@/components/ui';

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
  const venueName = save.pendingPerformance ? VENUES[save.pendingPerformance.venueId]?.name : null;

  const pick = params.get('pick'); // "main:0" | "ind:0"
  const open = (v: string) => setParams({ pick: v });
  const mainDef = (id: MainActionId | null) => MAIN.find((a) => a.id === id);

  return (
    <Panel
      title="이번 주 일정"
      subtitle={yearWeekLong(save)}
      nav="close"
      footer={
        <div className="col" style={{ width: '100%' }}>
          {!hasMembers && <Notice tone="warn">멤버가 없으면 한 주를 진행할 수 없다. 먼저 오디션에서 영입하자.</Notice>}
          <Btn variant="primary" size="lg" full disabled={!hasMembers || !hasAction} onClick={() => go('/schedule/resolution')}>
            다음 주로 ▶
          </Btn>
        </div>
      }
    >
      <Section title="밴드 활동 · 3칸">
        {plan.mainActions.map((a, i) => {
          const def = mainDef(a);
          return (
            <button key={i} className={`actionslot ${def ? 'actionslot--filled' : 'actionslot--empty'}`} onClick={() => open(`main:${i}`)}>
              <span className="actionslot__n">{i + 1}</span>
              <span className="grow">
                {def ? (
                  <>
                    <div className="actionslot__name">{def.name}{a === 'LIVE_SHOW' && venueName ? ` · ${venueName}` : ''}</div>
                    <div className="actionslot__desc">{def.summary}</div>
                    <div className="tags mt8">{def.affects.map((x) => <Tag key={x} tone="mute">{x}</Tag>)}</div>
                  </>
                ) : <span className="actionslot__empty">+ 활동 고르기</span>}
              </span>
              {def ? <span className="actionslot__cost">{def.cost ? won(def.cost) : '무료'}</span> : <span className="rowcard__chev">›</span>}
            </button>
          );
        })}
      </Section>

      <Section title="개인 일정 · 최대 2명">
        {plan.individualActions.map((ia, i) => {
          const def = IND.find((x) => x.id === ia.actionId);
          return (
            <button key={i} className="actionslot actionslot--filled" onClick={() => open(`ind:${i}`)}>
              <span className="actionslot__n">·</span>
              <span className="grow">
                <div className="actionslot__name">{CHARACTERS[ia.characterId].name}</div>
                <div className="actionslot__desc">{def?.name} · {def?.summary}</div>
              </span>
              <span className="actionslot__cost">{def?.cost ? won(def.cost) : '무료'}</span>
            </button>
          );
        })}
        {plan.individualActions.length < 2 && (
          <button className="actionslot actionslot--empty" onClick={() => open(`ind:${plan.individualActions.length}`)} disabled={!hasMembers}>
            <span className="actionslot__n">+</span>
            <span className="grow actionslot__empty">개인 일정 추가</span>
            <span className="rowcard__chev">›</span>
          </button>
        )}
      </Section>

      <Section title="진행 전 확인">
        <dl className="kv">
          <dt>예상 지출</dt><dd>{won(expense)}</dd>
          <dt>보유 자금</dt><dd>{won(save.economy.cash)}</dd>
          <dt>진행 후</dt><dd>{won(save.economy.cash - expense)}</dd>
        </dl>
        <div className="mt12">
          {warnings.map((w, i) => <div key={i} className={`notice ${w.level === 'RISK' ? 'notice--risk' : 'notice--warn'}`}>{w.text}</div>)}
          {warnings.length === 0 && <div className="notice">특별히 걱정할 일은 없어 보인다.</div>}
        </div>
      </Section>

      <BottomSheet open={!!pick} title={pick?.startsWith('main') ? '밴드 활동 고르기' : '개인 일정'} onClose={back}>
        {pick?.startsWith('main') && (
          <div className="col">
            {MAIN.map((a) => {
              const live = a.id === 'LIVE_SHOW';
              const locked = !activityUnlocked(save, a.id);
              const disabled = (live && !save.pendingPerformance) || locked;
              return (
                <button
                  key={a.id}
                  className={`rowcard rowcard--tap ${disabled ? 'rowcard--locked' : ''}`}
                  disabled={disabled}
                  onClick={() => { scheduleActions.setMainAction(Number(pick.split(':')[1]), a.id as MainActionId); back(); }}
                >
                  <span className="grow">
                    <div className="rowcard__title">{a.name}</div>
                    <div className="rowcard__meta">{locked ? '녹음실을 지어야 한다' : disabled ? '예정된 공연이 없다' : a.summary}</div>
                    <div className="tags mt8">{a.affects.map((x) => <Tag key={x} tone="mute">{x}</Tag>)}</div>
                  </span>
                  <span className="actionslot__cost">{a.cost ? won(a.cost) : '무료'}</span>
                </button>
              );
            })}
            <Btn full variant="ghost" onClick={() => { scheduleActions.setMainAction(Number(pick.split(':')[1]), null); back(); }}>이 칸 비우기</Btn>
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
        <div className="label dim caps">누구의 일정인가</div>
        {save.band.activeMembers.map((id) => (
          <button key={id} className="rowcard rowcard--tap" onClick={() => setParams({ pick: `ind:${index}`, m: id }, { replace: true })}>
            <span className="grow rowcard__title">{CHARACTERS[id].name}</span>
            <span className="rowcard__chev">›</span>
          </button>
        ))}
        {save.weeklyPlan.individualActions[index] && (
          <Btn full variant="ghost" onClick={() => { scheduleActions.setIndividualAction(index, null); onDone(); }}>이 일정 삭제</Btn>
        )}
      </div>
    );
  }
  return (
    <div className="col">
      <div className="label dim caps">{CHARACTERS[member as keyof typeof CHARACTERS]?.name} · 무엇을 할까</div>
      {IND.map((a) => (
        <button
          key={a.id}
          className="rowcard rowcard--tap"
          onClick={() => { scheduleActions.setIndividualAction(index, { characterId: member as never, actionId: a.id as IndividualActionId }); onDone(); }}
        >
          <span className="grow">
            <div className="rowcard__title">{a.name}</div>
            <div className="rowcard__meta">{a.summary}</div>
          </span>
          <span className="actionslot__cost">{a.cost ? won(a.cost) : '무료'}</span>
        </button>
      ))}
    </div>
  );
}
