// FACILITIES (IA §22): 같은 Basecamp를 건설 모드로 보여주고, 보유 / 건설 가능 / 잠김을 나눠 보여준다.
import { FACILITIES } from '@/data/master';
import { useSave } from '@/state/store';
import { basecampStage, facilityAvailability } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { BasecampWorld } from '@/world/BasecampWorld';
import { Btn, Notice, Section, Tag } from '@/components/ui';

export function FacilitiesScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const stage = basecampStage(save);
  const all = Object.values(FACILITIES).map((f) => ({ f, state: facilityAvailability(save, f.id) }));
  const built = all.filter((x) => x.state === 'BUILT');
  const available = all.filter((x) => x.state === 'AVAILABLE');
  const locked = all.filter((x) => x.state === 'LOCKED');

  return (
    <Panel title="시설" subtitle={`연습실 ${stage}단계`} nav="back" flush>
      <div style={{ position: 'relative', height: 210, borderBottom: '1px solid var(--c-border)' }}>
        <BasecampWorld mode="build" />
      </div>

      <div style={{ padding: '14px var(--gutter) 28px' }}>
        {available.length > 0 && (
          <Section title="지금 지을 수 있는 곳">
            {available.map(({ f }) => (
              <div key={f.id} className="rowcard rowcard--stack" style={{ borderColor: 'var(--c-amber)' }}>
                <div className="row row--between">
                  <div className="rowcard__title lead">{f.name}</div>
                  <Tag tone="amber">건설 가능</Tag>
                </div>
                <div className="rowcard__meta mt8">{f.description}</div>
                <dl className="kv mt12">
                  <dt>비용</dt><dd>{won(f.buildCost)}</dd>
                  <dt>효과</dt><dd style={{ textAlign: 'right', fontFamily: 'var(--font-info)' }}>{f.effectSummary}</dd>
                </dl>
                <div className="mt12"><Btn variant="amber" full onClick={() => go(`/management/facilities/build/${f.id}`)}>건설하기</Btn></div>
              </div>
            ))}
          </Section>
        )}

        <Section title="보유 중">
          {built.map(({ f }) => (
            <div key={f.id} className="rowcard">
              <span className="grow">
                <div className="rowcard__title">{f.name}</div>
                <div className="rowcard__meta">{f.effectSummary}</div>
              </span>
              <Tag tone="ok">{save.facilities[f.id]?.level ?? 1}단계</Tag>
            </div>
          ))}
        </Section>

        <Section title="아직 잠긴 공간">
          {locked.map(({ f }) => (
            <div key={f.id} className="rowcard rowcard--locked">
              <span className="grow">
                <div className="rowcard__title">{f.name}</div>
                <div className="rowcard__meta">{f.unlockCondition}</div>
              </span>
              <Tag tone="mute">잠김</Tag>
            </div>
          ))}
          {available.length === 0 && built.length > 0 && <Notice>지금 지을 수 있는 시설은 없다. 커리어가 올라가면 공간이 열린다.</Notice>}
        </Section>
      </div>
    </Panel>
  );
}
