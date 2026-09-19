// CHEMISTRY (IA §10): 6 diagnostics as words, relationship tags (no raw numbers), synergy reveals.
import { CHARACTERS, SYNERGIES, type CharacterId } from '@/data/master';
import { useSave } from '@/state/store';
import { chemistryDiagnostics } from '@/state/selectors';
import { bandDna } from '@/state/sim/musicDna';
import type { MusicDNA } from '@/data/master';
import { EmptyState, GradeLabel, Notice, Section, Tag } from '@/components/ui';

const DNA_LABELS: [keyof MusicDNA, string, string][] = [
  ['accessibility', '실험적', '대중적'],
  ['texture', '날것', '정제됨'],
  ['energy', '부드러움', '공격적'],
  ['focus', '분위기', '그루브'],
  ['tone', '어두움', '밝음'],
];
import { BandFrame } from './BandFrame';

export function ChemistryScreen() {
  const save = useSave();
  const d = chemistryDiagnostics(save);
  const dna = bandDna(save);
  const members = save.band.activeMembers;
  const pairs: [CharacterId, CharacterId][] = [];
  members.forEach((a, i) => members.slice(i + 1).forEach((b) => pairs.push([a, b])));
  const discovered = save.relationships.flatMap((r) => r.discoveredSynergies);

  return (
    <BandFrame>
      <Section title="전체 진단">
        <dl className="kv">
          <dt>음악적 궁합</dt><dd><GradeLabel value={d.musicalFit} /></dd>
          <dt>창작 균형</dt><dd><GradeLabel value={d.creativeBalance} /></dd>
          <dt>라이브 안정성</dt><dd><GradeLabel value={d.liveStability} /></dd>
          <dt>스타 파워</dt><dd><GradeLabel value={d.starPower} /></dd>
          <dt>팀워크</dt><dd><GradeLabel value={d.teamwork} /></dd>
          <dt>갈등 위험</dt><dd><GradeLabel value={d.conflictRisk} /></dd>
        </dl>
        <Notice>여섯 축은 {d.reason}. 지금은 추측할 근거가 없다.</Notice>
      </Section>

      <Section title="지금 확인되는 사운드">
        {!dna && <EmptyState text="라인업에 멤버가 있어야 밴드의 사운드가 생긴다." />}
        {dna && (
          <div className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title">소리의 결</span>
              <Tag tone={dna.cohesion > 0.6 ? 'ok' : 'amber'}>{dna.cohesion > 0.6 ? '한 방향' : '제각각'}</Tag>
            </div>
            <div className="col mt12" style={{ gap: 8 }}>
              {DNA_LABELS.map(([axis, low, high]) => (
                <div key={axis} className="statbar">
                  <span className="statbar__label">{low}</span>
                  <div className="statbar__track">
                    <div className="statbar__fill" style={{ width: `${(dna.mean[axis] + 100) / 2}%` }} />
                  </div>
                  <span className="statbar__value">{high}</span>
                </div>
              ))}
            </div>
            <div className="rowcard__meta mt12">역할 배치를 바꾸면 이 결도 달라진다.</div>
          </div>
        )}
      </Section>

      <Section title="멤버 사이">
        {pairs.length === 0 && <EmptyState text="멤버가 둘 이상 모이고 함께 활동해야 관계가 드러난다." />}
        {pairs.map(([a, b]) => {
          const edge = save.relationships.find((r) => (r.characterA === a && r.characterB === b) || (r.characterA === b && r.characterB === a));
          return (
            <div key={`${a}-${b}`} className="rowcard">
              <span className="grow rowcard__title">{CHARACTERS[a].name} × {CHARACTERS[b].name}</span>
              {edge ? <span className="tags">{edge.relationshipTags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : <span className="rowcard__meta">아직 알 수 없음</span>}
            </div>
          );
        })}
      </Section>

      <Section title="발견된 케미">
        {discovered.length === 0 && <Notice>특별한 조합은 함께 활동하다 보면 이름과 함께 드러난다.</Notice>}
        {discovered.map((id) => (
          <div key={id} className="rowcard rowcard--stack">
            <div className="rowcard__title accent">{SYNERGIES[id]?.name ?? id}</div>
            <div className="rowcard__meta mt8">{SYNERGIES[id]?.effect}</div>
          </div>
        ))}
      </Section>
    </BandFrame>
  );
}
