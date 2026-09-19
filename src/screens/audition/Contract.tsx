// CONTRACT (IA §14): 계약서가 아니라 캐릭터와 협상하는 장면.
// Salary / Duration / Role을 정해 제안하고, 결과는 합의 또는 역제안이다. Back -> Candidate Detail.
//
// PHASE 1 협상 개선:
//  - 수락 판정은 sim/contract.ts 한 곳에서만 내린다. 화면 표시·역제안·실제 체결이 같은 규칙을 쓴다.
//  - 확률을 굴리지 않으므로 "가능성 높음" 같은 확률 어휘를 쓰지 않는다.
//  - 합의한 조건을 스냅샷으로 들고 있다가 그대로 저장한다. 조건을 다시 건드리면 합의는 풀린다.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { weeklySalaryBurden, weeklySessionCost } from '@/state/selectors';
import { evaluateContract, sameTerms, type ContractTerms, type RolePromise } from '@/state/sim/contract';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';

const ROLE_LABEL: Record<RolePromise, string> = { CORE_MEMBER: '주전 멤버', SUPPORT_MEMBER: '서포트' };

export function ContractScreen() {
  const { id } = useParams();
  const save = useSave();
  const { go, back } = useGameNav();
  const cid = id as CharacterId;
  const c = CHARACTERS[cid];
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN' && a.candidateIds.includes(cid));
  const profile = CONTRACT_PROFILES[c?.contractProfileId ?? ''];

  const [salary, setSalary] = useState(profile?.baseSalary ?? 300000);
  const [duration, setDuration] = useState(profile?.preferredDurationWeeks ?? 52);
  const [role, setRole] = useState<RolePromise>('CORE_MEMBER');
  /** 마지막으로 제안했을 때의 조건과 그 결과. 조건이 바뀌면 다시 제안해야 한다. */
  const [offered, setOffered] = useState<ContractTerms | null>(null);

  if (!c || !audition) return <Panel title="계약" nav="back" immersive><EmptyState text="협상할 후보가 없다." /></Panel>;

  const terms: ContractTerms = { salary, durationWeeks: duration, rolePromise: role };
  const decision = evaluateContract(cid, terms);
  // 지금 화면의 조건이 곧 제안했던 조건일 때만 결과가 유효하다 (조건을 바꾸면 합의가 풀린다).
  const answered = sameTerms(offered, terms);
  const settled = answered && decision.accepted;
  const refused = answered && !decision.accepted;

  // 급여만 놓고 본 단순 추정 (활동비·수익 제외)
  const currentSalary = weeklySalaryBurden(save);
  const sessionCost = weeklySessionCost(save);
  const afterSalary = currentSalary + salary;
  const runwayBase = afterSalary + sessionCost;
  const runwayWeeks = runwayBase > 0 ? Math.floor(save.economy.cash / runwayBase) : null;

  const applyCounter = (t: ContractTerms) => {
    setSalary(t.salary);
    setDuration(t.durationWeeks);
    setRole(t.rolePromise);
    setOffered(t); // 역제안을 그대로 받아들인 것이므로 곧바로 합의 상태가 된다
  };

  const join = () => {
    // 저장되는 조건은 합의한 조건 그 자체다.
    if (!settled || !offered) return;
    auditionActions.signContract(audition.auditionId, cid, {
      salary: offered.salary, durationWeeks: offered.durationWeeks, rolePromise: offered.rolePromise,
    });
    go('/band', { replace: true });
  };

  return (
    <Panel
      title="계약 협상"
      subtitle={c.name}
      nav="back"
      immersive
      footer={settled
        ? <Btn variant="primary" size="lg" full onClick={join}>함께 하기로 한다</Btn>
        : (
          <>
            <Btn variant="ghost" onClick={back}>물러나기</Btn>
            <Btn variant="primary" size="lg" full onClick={() => setOffered(terms)}>
              {refused ? '다시 제안' : '제안하기'}
            </Btn>
          </>
        )}
    >
      {/* Negotiation scene */}
      <div className="row row--top">
        <CharacterVisual id={cid} variant="BUST" />
        <div className="grow choice">
          <div className="choice__title">{c.name}</div>
          <p className="choice__text">{refused
            ? '이 주급으로는 함께하기 어렵다고 한다.'
            : settled
              ? '조건을 듣고 고개를 끄덕인다.'
              : '테이블 건너편에 앉아 조건을 기다리고 있다.'}</p>
        </div>
      </div>

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
        <div className="seg">
          {PROTOTYPE_BALANCE.contract.durationOptionsWeeks.map((w) => (
            <button key={w} className={duration === w ? 'on' : ''} onClick={() => setDuration(w)}>{w}주</button>
          ))}
        </div>
      </Section>

      <Section title="역할">
        <div className="seg">
          <button className={role === 'CORE_MEMBER' ? 'on' : ''} onClick={() => setRole('CORE_MEMBER')}>주전 멤버</button>
          <button className={role === 'SUPPORT_MEMBER' ? 'on' : ''} onClick={() => setRole('SUPPORT_MEMBER')}>서포트</button>
        </div>
      </Section>

      {profile?.clauses.length ? (
        <Section title="이 사람이 요구하는 조항">
          <div className="tags">{profile.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>
        </Section>
      ) : null}

      <Section title="이 조건을 받아들일까">
        <div className="rowcard">
          <span className="grow">{decision.accepted ? '지금 조건이면 받아들인다' : '지금 주급으로는 받아들이지 않는다'}</span>
          <span className={`grade grade--${decision.accepted ? 'GOOD' : 'POOR'}`}>{decision.accepted ? '수락' : '거절'}</span>
        </div>
        <div className="rowcard__meta mt8">주급 {won(decision.minSalary)} 이상이면 받아들인다.</div>
        <div className="rowcard__meta mt8 dim">계약 기간과 역할은 계약서에 남지만 수락 여부를 바꾸지 않는다.</div>
      </Section>

      <Section title="급여만 따져본 자금">
        <dl className="kv">
          <dt>현재 주간 급여</dt><dd>{won(currentSalary)}</dd>
          {sessionCost > 0 && (<><dt>세션 비용</dt><dd>{won(sessionCost)}</dd></>)}
          <dt>영입 후 주간 급여</dt><dd>{won(afterSalary)}</dd>
          <dt>보유 자금</dt><dd>{won(save.economy.cash)}</dd>
          <dt>급여만 지급하면</dt><dd>{runwayWeeks === null ? '—' : `약 ${runwayWeeks}주`}</dd>
        </dl>
        <Notice>다른 활동비와 수익을 뺀 단순 추정치다.</Notice>
      </Section>

      {refused && (
        <Section title="이 조건이면 받아들인다">
          {decision.counters.length === 0 && <Notice tone="warn">받아들일 만한 조건이 없다.</Notice>}
          <div className="col" style={{ gap: 6 }}>
            {decision.counters.map((t) => (
              <Btn key={t.salary} size="sm" variant="secondary" full onClick={() => applyCounter(t)}>
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
