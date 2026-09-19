// Member Detail (IA §9): big visual, tabs Overview / Traits / Relations / Contract / Career.
// Shows core 5 stats + condition + discovered traits. Music DNA numbers and hidden sim values are NOT exposed.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, traitName, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord, currentVisibleStats } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { EmptyState, Section, StatBar, Tag, Todo } from '@/components/ui';

const TABS = ['OVERVIEW', 'TRAITS', 'RELATIONS', 'CONTRACT', 'CAREER'] as const;

export function MemberDetailScreen() {
  const { id } = useParams();
  const save = useSave();
  const [tab, setTab] = useState<(typeof TABS)[number]>('OVERVIEW');
  const cid = id as CharacterId;
  const def = CHARACTERS[cid];
  if (!def) return <Panel title="MEMBER" nav="back"><EmptyState text="알 수 없는 캐릭터" /></Panel>;
  const st = save.characterStates[cid];
  const stats = currentVisibleStats(save, cid);
  const contract = save.contracts[cid];
  const discovered = Object.entries(st?.traitStates ?? {}).filter(([, v]) => v === 'DISCOVERED').map(([k]) => k);
  const hasHidden = Object.values(st?.traitStates ?? {}).some((v) => v === 'HIDDEN');

  return (
    <Panel title={def.name} subtitle={def.positions.join(' / ')} nav="back" flush>
      <div style={{ display: 'grid', placeItems: 'center', padding: 12, borderBottom: '1px solid var(--c-border)' }}>
        <CharacterVisual id={cid} variant="FULL" />
      </div>
      <div className="seg" style={{ margin: '10px var(--gutter) 0' }}>
        {TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div style={{ padding: '4px var(--gutter) 24px' }}>
        {tab === 'OVERVIEW' && (
          <>
            <Section title="핵심 5 스탯">
              <div className="col">
                <StatBar label="실력" value={stats.skill} />
                <StatBar label="창의성" value={stats.creative} />
                <StatBar label="무대력" value={stats.stage} />
                <StatBar label="스타성" value={stats.star} />
                <StatBar label="프로의식" value={stats.pro} />
              </div>
            </Section>
            {st && (
              <Section title="현재 컨디션">
                <dl className="kv"><dt>체력</dt><dd>{conditionWord(st.condition.energy)}</dd><dt>멘탈</dt><dd>{conditionWord(100 - st.condition.stress)}</dd><dt>사기</dt><dd>{conditionWord(st.condition.morale)}</dd></dl>
              </Section>
            )}
            <Section title="음악 성향"><div className="tags">{def.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div></Section>
            <Section title="공개 특성"><div className="tags">{def.visibleTraitIds.map((t) => <Tag key={t} tone="amber">{traitName(t)}</Tag>)}</div></Section>
            <Todo>플레이어용 소개 문구(Hero 03의 한 줄 설명)는 VS 콘텐츠 단계에서 작성. Music DNA 수치는 UI에 노출하지 않는다.</Todo>
          </>
        )}
        {tab === 'TRAITS' && (
          <Section title="발견된 특성">
            <div className="tags">{discovered.map((t) => <Tag key={t} tone="amber">{traitName(t)}</Tag>)}</div>
            {hasHidden && <p className="dim small mt12">아직 알지 못하는 면이 있다. 함께 활동하면 드러난다.</p>}
          </Section>
        )}
        {tab === 'RELATIONS' && (
          <Section title="관계">
            {save.band.activeMembers.filter((m) => m !== cid).length === 0 && <div className="empty">다른 멤버가 아직 없다.</div>}
            {save.band.activeMembers.filter((m) => m !== cid).map((m) => {
              const edge = save.relationships.find((r) => (r.characterA === cid && r.characterB === m) || (r.characterA === m && r.characterB === cid));
              return (
                <div key={m} className="rowcard"><span className="grow">{CHARACTERS[m].name}</span>
                  <span className="tags">{edge ? edge.relationshipTags.map((t) => <Tag key={t}>{t}</Tag>) : <span className="xs faint">아직 드러나지 않음</span>}</span>
                </div>
              );
            })}
            <Todo>affinity / respect / tension 수치는 UI에 직접 노출하지 않고 해석 문장 + 태그로 표시 (IA §10).</Todo>
          </Section>
        )}
        {tab === 'CONTRACT' && (
          <Section title="계약">
            {!contract && <div className="empty">계약 정보 없음</div>}
            {contract && (
              <dl className="kv">
                <dt>Salary</dt><dd>{won(contract.salary)} / 주</dd>
                <dt>Duration</dt><dd>W{contract.startWeek} → W{contract.endWeek}</dd>
                <dt>Role</dt><dd>{contract.rolePromise}</dd>
                <dt>Clauses</dt><dd>{contract.clauses.length ? contract.clauses.map((c) => CLAUSE_LABELS[c] ?? c).join(', ') : '-'}</dd>
                <dt>Satisfaction</dt><dd>{conditionWord(contract.satisfaction)}</dd>
              </dl>
            )}
          </Section>
        )}
        {tab === 'CAREER' && (
          <Section title="커리어">
            <dl className="kv"><dt>합류</dt><dd>{st?.joinedWeek ? `W${st.joinedWeek}` : '-'}</dd><dt>단계</dt><dd>{st?.careerStage ?? '-'}</dd></dl>
            {save.careerHistory.filter((h) => h.text.includes(def.name)).map((h, i) => <div key={i} className="rowcard"><span className="mono xs dim">W{h.week}</span><span className="grow small">{h.text}</span></div>)}
          </Section>
        )}
      </div>
    </Panel>
  );
}
