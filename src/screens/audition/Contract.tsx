// CONTRACT (IA §14): 캐릭터와 협상하는 장면. Salary / Duration / Role (+ special clauses).
// Acceptance shown as words (Very Likely / Likely / Uncertain / Unlikely). Result ACCEPT / COUNTER / REJECT.
// Immersive (dock hidden). Back -> Candidate Detail.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Section, Tag, Todo } from '@/components/ui';

type Likelihood = 'Very Likely' | 'Likely' | 'Uncertain' | 'Unlikely';

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
  const [result, setResult] = useState<'ACCEPT' | 'COUNTER' | 'REJECT' | null>(null);

  if (!c || !audition) return <Panel title="CONTRACT" nav="back" immersive><EmptyState text="협상할 후보가 없다." /></Panel>;

  // TODO(PHASE2 engine): likelihood from contract profile + salary ratio + role + clauses + band reputation.
  const ratio = salary / (profile?.baseSalary ?? salary);
  const likelihood: Likelihood = ratio >= 1.1 ? 'Very Likely' : ratio >= 0.9 ? 'Likely' : ratio >= 0.75 ? 'Uncertain' : 'Unlikely';

  const offer = () => {
    // TODO(PHASE2 engine): COUNTER / REJECT outcomes. Prototype: Unlikely -> COUNTER, else ACCEPT.
    setResult(likelihood === 'Unlikely' ? 'COUNTER' : 'ACCEPT');
  };
  const join = () => {
    auditionActions.signContract(audition.auditionId, cid, { salary, durationWeeks: duration, rolePromise: role });
    go('/band', { replace: true });
  };

  return (
    <Panel
      title="CONTRACT"
      subtitle={`${c.name} · ${profile?.label ?? ''}`}
      nav="back"
      immersive
      footer={result === 'ACCEPT'
        ? <Btn variant="primary" full onClick={join}>JOIN BAND</Btn>
        : <><Btn variant="ghost" onClick={back}>WALK AWAY</Btn><Btn variant="primary" full onClick={offer}>{result === 'COUNTER' ? 'OFFER AGAIN' : 'MAKE OFFER'}</Btn></>}
    >
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <CharacterVisual id={cid} variant="BUST" />
        <div className="grow choice">
          <div className="choice__title">{c.name}</div>
          <div className="choice__text mono xs dim">[PLACEHOLDER_DIALOGUE_CONTRACT_{cid}]</div>
          <div className="xs faint">협상 대사는 VS 콘텐츠 단계에서 작성.</div>
        </div>
      </div>

      <Section title="Salary / 주">
        <div className="row">
          <div className="stepper">
            <button onClick={() => setSalary((s) => Math.max(50000, s - 50000))}>−</button>
            <span>{won(salary)}</span>
            <button onClick={() => setSalary((s) => s + 50000)}>+</button>
          </div>
          <span className="xs dim">기준 {won(profile?.baseSalary ?? 0)}</span>
        </div>
      </Section>
      <Section title="Duration">
        <div className="seg">{[26, 52, 104].map((w) => <button key={w} className={duration === w ? 'on' : ''} onClick={() => setDuration(w)}>{w}주</button>)}</div>
      </Section>
      <Section title="Role">
        <div className="seg">
          <button className={role === 'CORE_MEMBER' ? 'on' : ''} onClick={() => setRole('CORE_MEMBER')}>CORE MEMBER</button>
          <button className={role === 'SUPPORT_MEMBER' ? 'on' : ''} onClick={() => setRole('SUPPORT_MEMBER')}>SUPPORT</button>
        </div>
      </Section>
      {profile?.clauses.length ? (
        <Section title="특수 조항">
          <div className="tags">{profile.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>
        </Section>
      ) : null}

      <Section title="수락 가능성"><span className={`grade ${likelihood === 'Unlikely' ? 'grade--POOR' : likelihood === 'Uncertain' ? 'grade--FAIR' : 'grade--GOOD'}`}>{likelihood}</span></Section>

      {result && (
        <div className={`choice mt16`}>
          <div className="choice__title">RESULT</div>
          <div className="big-grade" style={{ fontSize: 24 }}>{result}</div>
          {result === 'COUNTER' && <div className="small dim">조건을 조정해서 다시 제안하라.</div>}
        </div>
      )}
      <Todo>수락 확률/카운터 로직, 계약금(GDD §04 상세 화면: 급여·기간·계약금·역할 요구·특별 조건)은 PHASE2.</Todo>
    </Panel>
  );
}
