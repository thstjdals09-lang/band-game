// Candidate Detail (IA §13): KNOWN / UNCERTAIN / UNKNOWN + 조사 행동 -> CONTRACT.
// Reads as "사람을 알아가는 화면": visual + name first, then what we know, then what we don't.
// Immersive (dock hidden). Back -> Audition.
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, CONTRACT_PROFILES, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Notice, Section, StatBar, Tag } from '@/components/ui';
import type { RevealKey } from '@/state/save/schema';

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

  const uncertain = [
    !has('TRAIT_2') && '겉으로 드러나지 않은 또 하나의 성향',
    !has('INTERVIEW') && '성격과 역할 선호, 계약에서 요구할 것',
    !has('JAM_SESSION') && '우리 음악과의 궁합, 무대 위에서의 태도',
    !has('BACKGROUND_CHECK') && '지금까지의 경력과 주변 평판',
    '얼마나 성장할 수 있는지',
  ].filter(Boolean) as string[];

  return (
    <Panel
      title={c.name}
      subtitle={c.positions.join(' / ')}
      nav="back"
      immersive
      footer={<Btn variant="primary" size="lg" full onClick={() => go(`/audition/contract/${cid}`)}>계약 협상</Btn>}
    >
      <div className="row row--top">
        <CharacterVisual id={cid} variant="FULL" />
        <div className="grow col" style={{ gap: 10 }}>
          <div className="tags">{c.positions.map((p) => <Tag key={p} tone="role">{p.toUpperCase()}</Tag>)}</div>
          <div className="tags">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <div className="tags">
            <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>
            {has('TRAIT_2') && c.visibleTraitIds[1] && <Tag tone="amber">{traitName(c.visibleTraitIds[1])}</Tag>}
          </div>
        </div>
      </div>

      <Section title="확인된 것">
        <div className="col" style={{ gap: 9 }}>
          <StatBar label="실력" value={c.visibleStats.skill} />
          <StatBar label="창의성" value={c.visibleStats.creative} />
          <StatBar label="무대력" value={c.visibleStats.stage} />
          <StatBar label="스타성" value={c.visibleStats.star} />
          <StatBar label="프로의식" value={c.visibleStats.pro} />
        </div>
        <dl className="kv mt16">
          <dt>계약 부담</dt><dd>{profile?.burden}</dd>
          {has('INTERVIEW') && <><dt>역할 선호</dt><dd>{c.positions.join(' / ')}</dd></>}
          {has('INTERVIEW') && <><dt>계약 요구</dt><dd>{profile?.clauses.length ? profile.clauses.map((k) => CLAUSE_LABELS[k]).join(', ') : '특별한 요구 없음'}</dd></>}
          {has('BACKGROUND_CHECK') && <><dt>지금까지</dt><dd>{c.recruitmentProfile.note}</dd></>}
          {has('JAM_SESSION') && <><dt>합주 인상</dt><dd>{save.band.activeMembers.length ? '맞춰볼 수 있었다' : '비교할 라인업이 없었다'}</dd></>}
        </dl>
      </Section>

      <Section title="아직 확실하지 않은 것">
        <ul className="col" style={{ gap: 8 }}>
          {uncertain.map((t) => <li key={t} className="row"><span className="step__bullet" /><span className="grow dim">{t}</span></li>)}
        </ul>
      </Section>

      <Section title="알 수 없는 것">
        <Notice>숨은 특성과 진짜 케미, 문제 행동은 함께 활동해 봐야 알 수 있다.</Notice>
      </Section>

      <Section title="더 알아보기">
        <div className="col">
          <Btn variant={has('INTERVIEW') ? 'ghost' : 'secondary'} size="lg" full disabled={has('INTERVIEW')} onClick={() => investigate('INTERVIEW')}>
            인터뷰{has('INTERVIEW') ? ' · 완료' : ''}
          </Btn>
          <Btn variant={has('JAM_SESSION') ? 'ghost' : 'secondary'} size="lg" full disabled={has('JAM_SESSION')} onClick={() => investigate('JAM_SESSION')}>
            합주해 보기{has('JAM_SESSION') ? ' · 완료' : ''}
          </Btn>
          <Btn variant={has('BACKGROUND_CHECK') ? 'ghost' : 'secondary'} size="lg" full disabled={has('BACKGROUND_CHECK')} onClick={() => investigate('BACKGROUND_CHECK')}>
            평판 조사{has('BACKGROUND_CHECK') ? ' · 완료' : ''}
          </Btn>
        </div>
      </Section>
    </Panel>
  );
}
