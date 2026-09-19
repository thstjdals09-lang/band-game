// FACILITIES (IA §22): same Basecamp shown in "건설 모드" + facility list (BUILT / AVAILABLE / LOCKED).
import { FACILITIES } from '@/data/master';
import { useSave } from '@/state/store';
import { basecampStage, facilityAvailability } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { BasecampWorld } from '@/world/BasecampWorld';
import { Btn, Section, Tag, Todo } from '@/components/ui';

export function FacilitiesScreen() {
  const save = useSave();
  const { go } = useGameNav();
  return (
    <Panel title="FACILITIES" subtitle={`건설 모드 · Basecamp Stage ${basecampStage(save)}`} nav="back" flush>
      <div style={{ position: 'relative', height: 220, borderBottom: '1px solid var(--c-border)' }}>
        <BasecampWorld mode="build" />
      </div>
      <div style={{ padding: '4px var(--gutter) 24px' }}>
        <Section title="시설">
          {Object.values(FACILITIES).map((f) => {
            const st = facilityAvailability(save, f.id);
            const level = save.facilities[f.id]?.level ?? 0;
            return (
              <div key={f.id} className={`rowcard ${st === 'LOCKED' ? 'rowcard--locked' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row row--between">
                  <div className="rowcard__title">{f.name}</div>
                  <Tag tone={st === 'AVAILABLE' ? 'amber' : st === 'BUILT' ? 'ok' : undefined}>{st === 'BUILT' ? `BUILT · L${level}` : st}</Tag>
                </div>
                <div className="rowcard__meta">{f.description}</div>
                {st === 'LOCKED' && <div className="rowcard__meta">해금 조건: {f.unlockCondition}</div>}
                {st === 'AVAILABLE' && (
                  <div className="row row--between mt8">
                    <div className="small"><div className="mono">{won(f.buildCost)}</div><div className="xs dim">{f.effectSummary}</div></div>
                    <Btn size="sm" variant="amber" onClick={() => go(`/management/facilities/build/${f.id}`)}>BUILD</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
        <Todo>시설 비용/효과/해금 조건 수치는 placeholder. 첫 시설 확장은 VS의 가장 큰 시각적 보상 - Construction Reveal 연출은 에셋 도착 후.</Todo>
      </div>
    </Panel>
  );
}
