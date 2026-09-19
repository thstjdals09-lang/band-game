// Candidate Detail (IA §13): KNOWN / UNCERTAIN / UNKNOWN + INTERVIEW / JAM SESSION / BACKGROUND CHECK -> CONTRACT.
// Immersive (dock hidden). Back -> Audition.
import { useParams } from 'react-router-dom';
import { CHARACTERS, CONTRACT_PROFILES, CLAUSE_LABELS, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { auditionActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Section, StatBar, Tag, Todo } from '@/components/ui';
import type { RevealKey } from '@/state/save/schema';

export function CandidateDetailScreen() {
  const { id } = useParams();
  const save = useSave();
  const { go } = useGameNav();
  const cid = id as CharacterId;
  const c = CHARACTERS[cid];
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN' && a.candidateIds.includes(cid));

  if (!c) return <Panel title="CANDIDATE" nav="back" immersive><EmptyState text="알 수 없는 후보" /></Panel>;
  if (!audition) {
    return (
      <Panel title={c.name} nav="back" immersive>
        <EmptyState text={save.band.activeMembers.includes(cid) ? '이미 밴드 멤버다.' : '현재 오디션 후보가 아니다.'} action={<Btn variant="secondary" onClick={() => go('/band/members')}>MEMBERS →</Btn>} />
      </Panel>
    );
  }

  const revealed = audition.revealedInformation[cid] ?? [];
  const has = (k: RevealKey) => revealed.includes(k);
  const investigate = (k: RevealKey) => auditionActions.investigate(audition.auditionId, cid, k);
  const profile = CONTRACT_PROFILES[c.contractProfileId];

  return (
    <Panel
      title={c.name}
      subtitle={c.positions.join(' / ')}
      nav="back"
      immersive
      footer={<Btn variant="primary" full onClick={() => go(`/audition/contract/${cid}`)}>NEGOTIATE CONTRACT</Btn>}
    >
      <div style={{ display: 'grid', placeItems: 'center' }}><CharacterVisual id={cid} variant="FULL" /></div>

      <Section title="KNOWN · 확실한 정보">
        <div className="col">
          <StatBar label="실력" value={c.visibleStats.skill} />
          <StatBar label="창의성" value={c.visibleStats.creative} />
          <StatBar label="무대력" value={c.visibleStats.stage} />
          <StatBar label="스타성" value={c.visibleStats.star} />
          <StatBar label="프로의식" value={c.visibleStats.pro} />
        </div>
        <div className="tags mt8">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        <dl className="kv mt8">
          <dt>공개 특성</dt><dd>{traitName(c.visibleTraitIds[0])}{has('TRAIT_2') && c.visibleTraitIds[1] ? `, ${traitName(c.visibleTraitIds[1])}` : ''}</dd>
          <dt>계약 부담</dt><dd>{profile?.burden}</dd>
          {has('INTERVIEW') && <><dt>역할 선호</dt><dd>{c.positions.join(' / ')}</dd></>}
          {has('INTERVIEW') && <><dt>계약 요구</dt><dd>{profile?.clauses.length ? profile.clauses.map((k) => CLAUSE_LABELS[k]).join(', ') : '특별 조항 없음'}</dd></>}
          {has('BACKGROUND_CHECK') && <><dt>경력 / 발견 경로</dt><dd>{c.recruitmentProfile.note}</dd></>}
          {has('JAM_SESSION') && <><dt>음악 궁합</dt><dd>{save.band.activeMembers.length ? '함께 맞춰볼 수 있었다 (등급: TODO PHASE2)' : '비교할 라인업이 아직 없다'}</dd></>}
        </dl>
      </Section>

      <Section title="UNCERTAIN · 추정 가능">
        <ul className="col small dim">
          {!has('TRAIT_2') && <li>· 두 번째 특성 - 인터뷰로 확인 가능</li>}
          {!has('INTERVIEW') && <li>· 성격, 역할 선호, 계약 요구 가능성</li>}
          {!has('JAM_SESSION') && <li>· 음악 궁합, 라이브 행동</li>}
          {!has('BACKGROUND_CHECK') && <li>· 경력, 평판, 과거 이슈</li>}
          <li>· 성장 가능성 - 실제 활동 전에는 추정만 가능</li>
        </ul>
      </Section>

      <Section title="UNKNOWN">
        <p className="small dim">숨은 특성, 진짜 케미, 문제 행동은 함께 활동해야 알 수 있다.</p>
      </Section>

      <Section title="조사">
        <div className="col">
          <Btn variant={has('INTERVIEW') ? 'ghost' : 'secondary'} full disabled={has('INTERVIEW')} onClick={() => investigate('INTERVIEW')}>INTERVIEW {has('INTERVIEW') && '· 완료'}</Btn>
          <Btn variant={has('JAM_SESSION') ? 'ghost' : 'secondary'} full disabled={has('JAM_SESSION')} onClick={() => investigate('JAM_SESSION')}>JAM SESSION {has('JAM_SESSION') && '· 완료'}</Btn>
          <Btn variant={has('BACKGROUND_CHECK') ? 'ghost' : 'secondary'} full disabled={has('BACKGROUND_CHECK')} onClick={() => investigate('BACKGROUND_CHECK')}>BACKGROUND CHECK {has('BACKGROUND_CHECK') && '· 완료'}</Btn>
        </div>
        <Todo>조사 행동의 비용/주간 슬롯 소비, 공개 정보 범위는 PHASE2 (GDD §04).</Todo>
      </Section>
    </Panel>
  );
}
