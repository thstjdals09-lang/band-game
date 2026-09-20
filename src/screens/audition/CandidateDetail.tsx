// Candidate Detail (IA §13): KNOWN / UNCERTAIN / UNKNOWN + 조사 행동 -> CONTRACT.
// Reads as "사람을 알아가는 화면": visual + name first, then what we know, then what we don't.
// Immersive (dock hidden). Back -> Audition.
//
// 조사 행동은 "아직 확실하지 않은 것" 안에 있다. 무엇을 모르는지와 그것을 알아내는 방법이 한 카드에 묶여 있고,
// 조사를 마치면 그 자리에서 알아낸 내용이 보인다. 확인된 사실은 기존대로 "확인된 것"에도 남는다.
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { candidateFieldView } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';
import type { RevealKey } from '@/state/save/schema';
import { FieldStats, RosterStrip, StandoutChips } from './parts';

export function CandidateDetailScreen() {
  const { id } = useParams();
  const save = useSave();
  const { go } = useGameNav();
  const cid = id as CharacterId;
  const c = CHARACTERS[cid];
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN' && a.candidateIds.includes(cid));

  if (!c) return <Panel title="후보" nav="back" immersive><EmptyState text="알 수 없는 후보" /></Panel>;
  if (!audition) {
    return (
      <Panel title={c.name} nav="back" immersive>
        <EmptyState
          text={save.band.activeMembers.includes(cid) ? '이미 우리 밴드의 멤버다.' : '지금 오디션 후보가 아니다.'}
          action={<Btn variant="secondary" onClick={() => go('/band/members')}>멤버 보기</Btn>}
        />
      </Panel>
    );
  }

  const revealed = audition.revealedInformation[cid] ?? [];
  const has = (k: RevealKey) => revealed.includes(k);
  const investigate = (k: RevealKey) => auditionActions.investigate(audition.auditionId, cid, k);
  const profile = CONTRACT_PROFILES[c.contractProfileId];
  const view = candidateFieldView(save, audition.auditionId, cid);

  const clauseText = profile?.clauses.length ? profile.clauses.map((k) => CLAUSE_LABELS[k]).join(', ') : '특별한 요구 없음';
  const jamText = save.band.activeMembers.length ? '맞춰볼 수 있었다' : '비교할 라인업이 없었다';

  // 무엇을 모르는지 + 그것을 알아내는 행동 + 알아낸 결과를 한 카드에 묶는다.
  const investigations: { key: RevealKey; title: string; unknowns: string[]; found: string[] }[] = [
    {
      key: 'INTERVIEW',
      title: '인터뷰',
      unknowns: [
        '성격과 역할 선호, 계약에서 요구할 것',
        ...(!has('TRAIT_2') ? ['겉으로 드러나지 않은 또 하나의 성향'] : []),
      ],
      found: [
        `역할 선호 · ${c.positions.join(' / ')}`,
        `계약 요구 · ${clauseText}`,
        ...(c.visibleTraitIds[1] ? [`드러난 성향 · ${traitName(c.visibleTraitIds[1])}`] : []),
      ],
    },
    {
      key: 'JAM_SESSION',
      title: '합주해 보기',
      unknowns: ['우리 음악과의 궁합, 무대 위에서의 태도'],
      found: [`합주 인상 · ${jamText}`],
    },
    {
      key: 'BACKGROUND_CHECK',
      title: '평판 조사',
      unknowns: ['지금까지의 경력과 주변 평판'],
      found: [`지금까지 · ${c.recruitmentProfile.note}`],
    },
  ];
  const doneCount = investigations.filter((x) => has(x.key)).length;

  return (
    <Panel
      title={c.name}
      subtitle={c.positions.join(' / ')}
      nav="back"
      immersive
      footer={<Btn variant="primary" size="lg" full onClick={() => go(`/audition/contract/${cid}`)}>계약 협상</Btn>}
    >
      {/* 다른 후보로 바로 넘어갈 수 있다. 뒤로 가기는 여전히 오디션 목록으로 돌아간다. */}
      <RosterStrip
        audition={audition}
        selectedId={cid}
        compact
        onSelect={(next) => { if (next !== cid) go(`/audition/candidate/${next}`, { replace: true }); }}
      />

      <div className="row row--top mt12">
        <CharacterVisual id={cid} variant="FULL" />
        <div className="grow col" style={{ gap: 10 }}>
          <div className="tags">{c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}</div>
          <div className="tags">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <div className="tags">
            <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>
            {has('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
          </div>
          <StandoutChips view={view} />
        </div>
      </div>

      <Section title="확인된 것">
        <FieldStats view={view} />
        <dl className="kv mt16">
          <dt>계약 부담</dt><dd>{profile?.burden}</dd>
          {has('INTERVIEW') && <><dt>역할 선호</dt><dd>{c.positions.join(' / ')}</dd></>}
          {has('INTERVIEW') && <><dt>계약 요구</dt><dd>{clauseText}</dd></>}
          {has('BACKGROUND_CHECK') && <><dt>지금까지</dt><dd>{c.recruitmentProfile.note}</dd></>}
          {has('JAM_SESSION') && <><dt>합주 인상</dt><dd>{jamText}</dd></>}
        </dl>
      </Section>

      <Section title="아직 확실하지 않은 것">
        <div className="inv__progress">직접 알아볼 수 있다 · {doneCount}/{investigations.length} 확인</div>
        <div className="col" style={{ gap: 8 }}>
          {investigations.map((x) => {
            const done = has(x.key);
            return (
              <button
                key={x.key}
                className={`inv ${done ? 'inv--done' : ''}`}
                disabled={done}
                onClick={() => investigate(x.key)}
              >
                <span className="inv__head">
                  <span className="inv__title">{x.title}</span>
                  <span className="inv__state">{done ? '완료' : '알아보기 ›'}</span>
                </span>
                {(done ? x.found : x.unknowns).map((t) => (
                  <span key={t} className={done ? 'inv__found' : 'inv__unknown'}>{t}</span>
                ))}
              </button>
            );
          })}
        </div>
        <ul className="col mt12" style={{ gap: 8 }}>
          <li className="row"><span className="step__bullet" /><span className="grow dim">얼마나 성장할 수 있는지</span></li>
        </ul>
      </Section>

      <Section title="알 수 없는 것">
        <Notice>숨은 특성과 진짜 케미, 문제 행동은 함께 활동해 봐야 알 수 있다.</Notice>
      </Section>
    </Panel>
  );
}
