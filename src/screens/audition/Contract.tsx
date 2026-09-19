// CONTRACT (IA §14): 계약서가 아니라 캐릭터와 협상하는 장면.
// 한 화면이 세 가지 협상을 모두 맡는다 (새 화면을 만들지 않는다).
//   SIGN        오디션 후보와 첫 계약
//   RENEW       계약 마지막 구간의 재계약 (CONTRACT V1 §3)
//   ROLE_CHANGE 계약 중 역할 변경 재협상 (CONTRACT V1 §5)
//
// 판정은 전부 sim/contract.ts의 evaluateContract()를 통과한다. 확률을 굴리지 않으므로
// 확률처럼 보이는 표현을 쓰지 않는다. 합의는 조건 스냅샷에 묶이고, 조건이 바뀌면 풀린다.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions, contractActions } from '@/state/actions';
import { candidateFieldView, weeklySalaryBurden, weeklySessionCost } from '@/state/selectors';
import {
  absoluteWeek, evaluateContract, nearestDurationOption, renewalOpen, sameTerms,
  type ContractTerms, type RolePromise,
} from '@/state/sim/contract';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';
import { StandoutChips } from './parts';

const ROLE_LABEL: Record<RolePromise, string> = { CORE_MEMBER: '주전 멤버', SUPPORT_MEMBER: '서포트' };

export function ContractScreen() {
  const { id } = useParams();
  const save = useSave();
  const { go, back } = useGameNav();
  const cid = id as CharacterId;
  const c = CHARACTERS[cid];
  const profile = CONTRACT_PROFILES[c?.contractProfileId ?? ''];

  const existing = save.contracts[cid] ?? null;
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN' && a.candidateIds.includes(cid));
  const mode: 'SIGN' | 'RENEW' | 'ROLE_CHANGE' | 'NONE' = existing
    ? (renewalOpen(existing, save.world) ? 'RENEW' : 'ROLE_CHANGE')
    : (audition ? 'SIGN' : 'NONE');

  const remainingWeeks = existing ? existing.endWeek - absoluteWeek(save.world) + 1 : 0;
  const lockedDuration = mode === 'ROLE_CHANGE' ? nearestDurationOption(remainingWeeks) : null;

  const [salary, setSalary] = useState(existing?.salary ?? profile?.baseSalary ?? 300000);
  const [duration, setDuration] = useState(profile?.preferredDurationWeeks ?? 52);
  const [role, setRole] = useState<RolePromise>(existing?.rolePromise ?? 'CORE_MEMBER');
  /** 마지막으로 제안한 조건. 지금 조건과 같을 때만 그 결과가 유효하다. */
  const [offered, setOffered] = useState<ContractTerms | null>(null);

  if (!c || mode === 'NONE') {
    return <Panel title="계약" nav="back" immersive><EmptyState text="협상할 상대가 없다." /></Panel>;
  }

  const effectiveDuration = lockedDuration ?? duration;
  const terms: ContractTerms = { salary, durationWeeks: effectiveDuration, rolePromise: role };
  const decision = evaluateContract(cid, salary, effectiveDuration, role);
  const answered = sameTerms(offered, terms);
  const settled = answered && decision.accepted;
  const refused = answered && !decision.accepted;

  // 급여만 놓고 본 단순 추정 (활동비·수익 제외)
  const currentSalary = weeklySalaryBurden(save);
  const sessionCost = weeklySessionCost(save);
  const afterSalary = mode === 'SIGN' ? currentSalary + salary : currentSalary - (existing?.salary ?? 0) + salary;
  const runwayBase = afterSalary + sessionCost;
  const runwayWeeks = runwayBase > 0 ? Math.floor(save.economy.cash / runwayBase) : null;

  const applyCounter = (t: ContractTerms) => {
    setSalary(t.salary);
    if (!lockedDuration) setDuration(t.durationWeeks);
    setRole(t.rolePromise);
    setOffered(t); // 역제안을 그대로 받아들였으므로 곧바로 합의 상태가 된다
  };

  const confirm = () => {
    if (!settled || !offered) return;
    if (mode === 'SIGN' && audition) {
      auditionActions.signContract(audition.auditionId, cid, {
        salary: offered.salary, durationWeeks: offered.durationWeeks, rolePromise: offered.rolePromise,
      });
      go('/band', { replace: true });
      return;
    }
    if (mode === 'RENEW') {
      contractActions.renew(cid, {
        salary: offered.salary, durationWeeks: offered.durationWeeks, rolePromise: offered.rolePromise,
      });
    } else {
      contractActions.changeRole(cid, { salary: offered.salary, rolePromise: offered.rolePromise });
    }
    go('/management/contracts', { replace: true });
  };

  // 오디션 후보와 협상할 때는, 이 사람을 왜 골랐는지(공개된 강점)를 테이블 위에 다시 올려 둔다.
  const fieldView = mode === 'SIGN' && audition ? candidateFieldView(save, audition.auditionId, cid) : null;

  const title = mode === 'SIGN' ? '계약 협상' : mode === 'RENEW' ? '재계약 협상' : '역할 재협상';
  const confirmLabel = mode === 'SIGN' ? '함께 하기로 한다' : mode === 'RENEW' ? '재계약한다' : '역할을 바꾼다';

  return (
    <Panel
      title={title}
      subtitle={c.name}
      nav="back"
      immersive
      footer={settled
        ? <Btn variant="primary" size="lg" full onClick={confirm}>{confirmLabel}</Btn>
        : (
          <>
            <Btn variant="ghost" onClick={back}>물러나기</Btn>
            <Btn variant="primary" size="lg" full onClick={() => setOffered(terms)}>
              {refused ? '다시 제안' : '제안하기'}
            </Btn>
          </>
        )}
    >
      <div className="row row--top">
        <CharacterVisual id={cid} variant="BUST" />
        <div className="grow choice">
          <div className="choice__title">{c.name}</div>
          <div className="tags mt8">{c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}</div>
          <p className="choice__text">{answered
            ? decision.reason
            : '테이블 건너편에 앉아 조건을 기다리고 있다.'}</p>
        </div>
      </div>
      {fieldView && fieldView.standouts.length > 0 && (
        <div className="mt12"><StandoutChips view={fieldView} /></div>
      )}

      {existing && (
        <Section title="지금 계약">
          <dl className="kv">
            <dt>주급</dt><dd>{won(existing.salary)}</dd>
            <dt>역할</dt><dd>{ROLE_LABEL[existing.rolePromise]}</dd>
            <dt>남은 기간</dt><dd>{Math.max(0, remainingWeeks)}주</dd>
          </dl>
          {mode === 'RENEW' && <Notice>계약이 끝나는 주까지는 지금 조건이 그대로 간다. 새 계약은 그 다음 주에 시작한다.</Notice>}
          {mode === 'ROLE_CHANGE' && <Notice>계약 만료일은 그대로다. 합의한 조건은 다음 주부터 적용된다.</Notice>}
          {existing.renewal && <Notice tone="info">이미 재계약에 합의했다 · 주급 {won(existing.renewal.salary)} · {existing.renewal.durationWeeks}주</Notice>}
          {existing.pendingChange && <Notice tone="info">다음 주부터 {ROLE_LABEL[existing.pendingChange.rolePromise]}로 바뀐다</Notice>}
        </Section>
      )}

      <Section title="주급">
        <div className="row row--between">
          <div className="stepper">
            <button onClick={() => setSalary((s) => Math.max(PROTOTYPE_BALANCE.contract.minSalary, s - PROTOTYPE_BALANCE.contract.salaryStep))} aria-label="주급 내리기">−</button>
            <span>{won(salary)}</span>
            <button onClick={() => setSalary((s) => s + PROTOTYPE_BALANCE.contract.salaryStep)} aria-label="주급 올리기">+</button>
          </div>
          <span className="meta dim">기준 {won(decision.baseSalary)}</span>
        </div>
      </Section>

      <Section title="계약 기간">
        {lockedDuration ? (
          <div className="rowcard"><span className="grow">남은 계약 {Math.max(0, remainingWeeks)}주를 그대로 쓴다</span></div>
        ) : (
          <div className="seg">
            {PROTOTYPE_BALANCE.contract.durationOptionsWeeks.map((w) => (
              <button key={w} className={duration === w ? 'on' : ''} onClick={() => setDuration(w)}>{w}주</button>
            ))}
          </div>
        )}
        <div className="rowcard__meta mt8">{c.name}이(가) 선호하는 기간은 {decision.preferredDurationWeeks}주다.</div>
      </Section>

      <Section title="역할">
        <div className="seg">
          <button className={role === 'CORE_MEMBER' ? 'on' : ''} onClick={() => setRole('CORE_MEMBER')}>주전 멤버</button>
          <button className={role === 'SUPPORT_MEMBER' ? 'on' : ''} onClick={() => setRole('SUPPORT_MEMBER')}>서포트</button>
        </div>
        <div className="rowcard__meta mt8">
          주전은 최근 공연 {PROTOTYPE_BALANCE.contract.starterRecentShows}회 중 결장 {PROTOTYPE_BALANCE.contract.starterAllowedAbsences}회까지만 허용하는 약속이다.
        </div>
      </Section>

      {profile?.clauses.length ? (
        <Section title="이 사람이 요구하는 조항">
          <div className="tags">{profile.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>
        </Section>
      ) : null}

      <Section title="이 조건을 받아들일까">
        <div className="rowcard">
          <span className="grow">{decision.accepted ? '지금 조건이면 받아들인다' : '지금 조건으로는 받아들이지 않는다'}</span>
          <span className={`grade grade--${decision.accepted ? 'GOOD' : 'POOR'}`}>{decision.accepted ? '수락' : '거절'}</span>
        </div>
        <div className="rowcard__meta mt8">{decision.reason}</div>
        <div className="rowcard__meta mt8 dim">
          {effectiveDuration}주 · {ROLE_LABEL[role]} 조건에서는 주급 {won(decision.requiredSalary)} 이상이면 받아들인다.
        </div>
      </Section>

      <Section title="급여만 따져본 자금">
        <dl className="kv">
          <dt>현재 주간 급여</dt><dd>{won(currentSalary)}</dd>
          {sessionCost > 0 && (<><dt>세션 비용</dt><dd>{won(sessionCost)}</dd></>)}
          <dt>{mode === 'SIGN' ? '영입 후' : '변경 후'} 주간 급여</dt><dd>{won(afterSalary)}</dd>
          <dt>보유 자금</dt><dd>{won(save.economy.cash)}</dd>
          <dt>급여만 지급하면</dt><dd>{runwayWeeks === null ? '—' : `약 ${runwayWeeks}주`}</dd>
        </dl>
        <Notice>다른 활동비와 수익을 뺀 단순 추정치다.</Notice>
      </Section>

      {refused && (
        <Section title="이 조건이면 받아들인다">
          {decision.counterOffers.length === 0 && <Notice tone="warn">받아들일 만한 조건이 없다.</Notice>}
          <div className="col" style={{ gap: 6 }}>
            {decision.counterOffers.map((t, i) => (
              <Btn key={i} size="sm" variant="secondary" full onClick={() => applyCounter(t)}>
                주급 {won(t.salary)} · {t.durationWeeks}주 · {ROLE_LABEL[t.rolePromise]}
              </Btn>
            ))}
          </div>
        </Section>
      )}

      {settled && <Notice tone="info">주급 {won(offered!.salary)} · {offered!.durationWeeks}주 · {ROLE_LABEL[offered!.rolePromise]}로 합의했다.</Notice>}
      {answered === false && offered !== null && (
        <Notice tone="warn">조건이 바뀌었다. 다시 제안해야 한다.</Notice>
      )}
    </Panel>
  );
}
