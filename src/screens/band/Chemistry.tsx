// CHEMISTRY (IA §10): 6 diagnostics as words, relationship tags (no raw numbers), synergy reveals.
import { CHARACTERS, SYNERGIES } from '@/data/master';
import { useSave } from '@/state/store';
import { chemistryDiagnostics } from '@/state/selectors';
import { EmptyState, GradeLabel, Section, Tag, Todo } from '@/components/ui';
import { BandFrame } from './BandFrame';

export function ChemistryScreen() {
  const save = useSave();
  const d = chemistryDiagnostics(save);
  const members = save.band.activeMembers;
  const pairs: [string, string][] = [];
  members.forEach((a, i) => members.slice(i + 1).forEach((b) => pairs.push([a, b])));
  const discovered = save.relationships.flatMap((r) => r.discoveredSynergies);

  return (
    <BandFrame>
      <Section title="전체 진단">
        <dl className="kv">
          <dt>Musical Fit</dt><dd><GradeLabel value={d.musicalFit} /></dd>
          <dt>Creative Balance</dt><dd><GradeLabel value={d.creativeBalance} /></dd>
          <dt>Live Stability</dt><dd><GradeLabel value={d.liveStability} /></dd>
          <dt>Star Power</dt><dd><GradeLabel value={d.starPower} /></dd>
          <dt>Teamwork</dt><dd><GradeLabel value={d.teamwork} /></dd>
          <dt>Conflict Risk</dt><dd><GradeLabel value={d.conflictRisk} /></dd>
        </dl>
        <Todo>PHASE2 engine: Music DNA 평균+분산+극단값+역할 영향도, Personality, 관계에서 재계산 (Character Master §05/§14). 현재는 placeholder 등급.</Todo>
      </Section>
      <Section title="관계">
        {pairs.length === 0 && <EmptyState text="관계는 멤버가 2명 이상일 때, 함께 활동한 뒤 드러난다." />}
        {pairs.map(([a, b]) => {
          const edge = save.relationships.find((r) => (r.characterA === a && r.characterB === b) || (r.characterA === b && r.characterB === a));
          return (
            <div key={`${a}-${b}`} className="rowcard">
              <span className="grow">{CHARACTERS[a as keyof typeof CHARACTERS].name} × {CHARACTERS[b as keyof typeof CHARACTERS].name}</span>
              {edge ? <span className="tags">{edge.relationshipTags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : <span className="xs faint">아직 알 수 없음</span>}
            </div>
          );
        })}
      </Section>
      <Section title="발견된 시너지">
        {discovered.length === 0 && <div className="xs faint">아직 발견된 특수 케미가 없다. 발견 시 이름과 함께 별도 Reveal된다.</div>}
        {discovered.map((id) => <div key={id} className="rowcard"><span className="accent">{SYNERGIES[id]?.name ?? id}</span><span className="grow small dim">{SYNERGIES[id]?.effect}</span></div>)}
      </Section>
    </BandFrame>
  );
}
