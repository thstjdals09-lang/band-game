// CONTRACT (IA §14): 계약서가 아니라 캐릭터와 협상하는 장면.
// Salary / Duration / Role, 수락 가능성은 숫자 대신 말로. 결과는 ACCEPT / COUNTER / REJECT.
// Immersive (dock hidden). Back -> Candidate Detail.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';

type Likelihood = '거의 확실' | '가능성 높음' | '반반' | '어려움';

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
  const [role, setRole] = useState<'CORE_MEMBER' | 'SUPPORT_MEMBER'>('CORE_MEMBER');
  const [result, setResult] = useState<'ACCEPT' | 'COUNTER' | null>(null);

  if (!c || !audition) return <Panel title="계약" nav="back" immersive><EmptyState text="협상할 후보가 없다." /></Panel>;

  // TODO(PHASE2 engine): likelihood from contract profile + salary ratio + role + clauses + band reputation.
  const ratio = salary / (profile?.baseSalary ?? salary);
  const likelihood: Likelihood = ratio >= 1.1 ? '거의 확실' : ratio >= 0.9 ? '가능성 높음' : ratio >= 0.75 ? '반반' : '어려움';
  const likeTone = likelihood === '어려움' ? 'POOR' : likelihood === '반반' ? 'FAIR' : 'GOOD';

  const offer = () => setResult(likelihood === '어려움' ? 'COUNTER' : 'ACCEPT');
  const join = () => {
    auditionActions.signContract(audition.auditionId, cid, { salary, durationWeeks: duration, rolePromise: role });
    go('/band', { replace: true });
  };

  return (
    <Panel
      title="계약 협상"
      subtitle={c.name}
      nav="back"
      immersive
      footer={result === 'ACCEPT'
        ? <Btn variant="primary" size="lg" full onClick={join}>함께 하기로 한다</Btn>
        : (
          <>
            <Btn variant="ghost" onClick={back}>물러나기</Btn>
            <Btn variant="primary" size="lg" full onClick={offer}>{result === 'COUNTER' ? '다시 제안' : '제안하기'}</Btn>
          </>
        )}
    >
      {/* Negotiation scene */}
      <div className="row row--top">
        <CharacterVisual id={cid} variant="BUST" />
        <div className="grow choice">
          <div className="choice__title">{c.name}</div>
          <p className="choice__text">{result === 'COUNTER'
            ? '조건을 다시 생각해 봤으면 한다는 눈치다.'
            : result === 'ACCEPT'
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
          <span className="meta dim">기준 {won(profile?.baseSalary ?? 0)}</span>
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

      <Section title="수락 가능성">
        <div className="rowcard"><span className="grow">지금 조건이라면</span><span className={`grade grade--${likeTone}`}>{likelihood}</span></div>
      </Section>

      {result === 'COUNTER' && <Notice tone="warn">조건을 조정해서 다시 제안해 보자.</Notice>}
      {result === 'ACCEPT' && <Notice tone="info">합의했다. 이제 밴드에 합류시킬 수 있다.</Notice>}
    </Panel>
  );
}
