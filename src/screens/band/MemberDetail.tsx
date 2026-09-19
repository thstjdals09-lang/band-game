// Member Detail (IA §9): big visual, tabs 개요 / 특성 / 관계 / 계약 / 커리어.
// Core 5 stats + condition + discovered traits. Music DNA numbers and hidden sim values are never exposed.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CHARACTERS, CLAUSE_LABELS, PROTOTYPE_BALANCE, traitName, type CharacterId } from '@/data/master';

const STAT_LABEL = { skill: '실력', creative: '창의성', stage: '무대력', star: '스타성', pro: '프로의식' } as const;
import { useSave } from '@/state/store';
import { conditionWord, currentVisibleStats } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { EmptyState, Notice, Section, StatBar, Tag } from '@/components/ui';

const TABS = ['개요', '특성', '관계', '계약', '커리어'] as const;

export function MemberDetailScreen() {
  const { id } = useParams();
  const save = useSave();
  const [tab, setTab] = useState<(typeof TABS)[number]>('개요');
  const cid = id as CharacterId;
  const def = CHARACTERS[cid];
  if (!def) return <Panel title="멤버" nav="back"><EmptyState text="알 수 없는 캐릭터" /></Panel>;

  const st = save.characterStates[cid];
  const stats = currentVisibleStats(save, cid);
  const contract = save.contracts[cid];
  const discovered = Object.entries(st?.traitStates ?? {}).filter(([, v]) => v === 'DISCOVERED').map(([k]) => k);
  const perStage = PROTOTYPE_BALANCE.growth.experiencePerStage;
  const nextStageIn = st ? `${perStage - (st.growth.experience % perStage)} 경험` : '-';
  const hasHidden = Object.values(st?.traitStates ?? {}).some((v) => v === 'HIDDEN');

  return (
    <Panel title={def.name} subtitle={def.positions.join(' / ')} nav="back" flush>
      <div style={{ display: 'grid', placeItems: 'center', padding: 16, borderBottom: '1px solid var(--c-border)' }}>
        <CharacterVisual id={cid} variant="FULL" />
      </div>
      <div style={{ padding: '12px var(--gutter) 0' }}>
        <div className="seg">
          {TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      </div>
      <div style={{ padding: '8px var(--gutter) 28px' }}>
        {tab === '개요' && (
          <>
            <Section title="핵심 5 스탯">
              <div className="col" style={{ gap: 9 }}>
                {(['skill', 'creative', 'stage', 'star', 'pro'] as const).map((k) => (
                  <div key={k}>
                    <StatBar label={STAT_LABEL[k]} value={stats[k]} />
                    {stats[k] > def.visibleStats[k] && (
                      <div className="label accent" style={{ textAlign: 'right' }}>
                        영입 시 {def.visibleStats[k]} · +{stats[k] - def.visibleStats[k]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="성장">
              <dl className="kv">
                <dt>단계</dt><dd>{st?.growth.developmentStage ?? 0}단계</dd>
                <dt>다음 단계까지</dt><dd>{nextStageIn}</dd>
                <dt>쌓은 경험</dt><dd>{st?.growth.experience ?? 0}</dd>
                <dt>개인 인기</dt><dd>{st?.personalPopularity ?? 0}</dd>
              </dl>
            </Section>
            {st && (
              <Section title="현재 컨디션">
                <dl className="kv">
                  <dt>체력</dt><dd>{conditionWord(st.condition.energy)}</dd>
                  <dt>멘탈</dt><dd>{conditionWord(100 - st.condition.stress)}</dd>
                  <dt>사기</dt><dd>{conditionWord(st.condition.morale)}</dd>
                </dl>
              </Section>
            )}
            <Section title="음악 성향"><div className="tags">{def.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div></Section>
            <Section title="공개 특성"><div className="tags">{def.visibleTraitIds.map((t) => <Tag key={t} tone="amber">{traitName(t)}</Tag>)}</div></Section>
          </>
        )}

        {tab === '특성' && (
          <Section title="드러난 특성">
            <div className="tags">{discovered.map((t) => <Tag key={t} tone="amber">{traitName(t)}</Tag>)}</div>
            {hasHidden && <Notice>아직 알지 못하는 면이 있다. 함께 활동하다 보면 드러난다.</Notice>}
          </Section>
        )}

        {tab === '관계' && (
          <Section title="다른 멤버와의 관계">
            {save.band.activeMembers.filter((m) => m !== cid).length === 0 && <EmptyState text="아직 다른 멤버가 없다." />}
            {save.band.activeMembers.filter((m) => m !== cid).map((m) => {
              const edge = save.relationships.find((r) => (r.characterA === cid && r.characterB === m) || (r.characterA === m && r.characterB === cid));
              return (
                <div key={m} className="rowcard">
                  <span className="grow rowcard__title">{CHARACTERS[m].name}</span>
                  {edge ? <span className="tags">{edge.relationshipTags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : <span className="rowcard__meta">아직 드러나지 않음</span>}
                </div>
              );
            })}
          </Section>
        )}

        {tab === '계약' && (
          <Section title="계약 내용">
            {!contract && <EmptyState text="계약 정보가 없다." />}
            {contract && (
              <dl className="kv">
                <dt>주급</dt><dd>{won(contract.salary)}</dd>
                <dt>기간</dt><dd>{contract.startWeek}주 → {contract.endWeek}주</dd>
                <dt>역할</dt><dd>{contract.rolePromise === 'CORE_MEMBER' ? '주전 멤버' : '서포트'}</dd>
                <dt>특별 조항</dt><dd>{contract.clauses.length ? contract.clauses.map((c) => CLAUSE_LABELS[c] ?? c).join(', ') : '없음'}</dd>
                <dt>만족도</dt><dd>{conditionWord(contract.satisfaction)}</dd>
              </dl>
            )}
          </Section>
        )}

        {tab === '커리어' && (
          <Section title="여기까지">
            <dl className="kv">
              <dt>합류</dt><dd>{st?.joinedWeek ? `${st.joinedWeek}주차` : '-'}</dd>
              <dt>단계</dt><dd>{st?.careerStage === 'ROOKIE' ? '신인' : st?.careerStage ?? '-'}</dd>
            </dl>
            <div className="mt12">
              {save.careerHistory.filter((h) => h.text.includes(def.name)).map((h, i) => (
                <div key={i} className="rowcard"><span className="mono meta dim">{h.week}주</span><span className="grow">{h.text}</span></div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Panel>
  );
}
