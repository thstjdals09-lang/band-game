// COMPARE (IA §12): up to 2~3 shortlisted candidates side by side. Back -> Audition.
import { CHARACTERS, CONTRACT_PROFILES, traitName } from '@/data/master';
import { useSave } from '@/state/store';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, StatBar, Tag } from '@/components/ui';

export function CompareScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN');
  const ids = (audition?.compareIds ?? []).slice(0, 3);
  if (ids.length < 2) return <Panel title="COMPARE" nav="back"><EmptyState text="Shortlist에 2명 이상을 넣은 뒤 COMPARE를 누른다." /></Panel>;

  return (
    <Panel title="COMPARE" subtitle={`${ids.length}명 비교`} nav="back">
      <div className={`compare compare--${ids.length}`}>
        {ids.map((id) => {
          const c = CHARACTERS[id];
          return (
            <div key={id} className="compare__col">
              <div style={{ display: 'grid', placeItems: 'center' }}><CharacterVisual id={id} variant="THUMB" /></div>
              <div className="rowcard__title mt8" style={{ textAlign: 'center' }}>{c.name}</div>
              <div style={{ textAlign: 'center' }}><Tag tone="role">{c.positions[0].toUpperCase()}</Tag></div>
              <div className="col mt8" style={{ gap: 4 }}>
                <StatBar label="실력" value={c.visibleStats.skill} />
                <StatBar label="창의" value={c.visibleStats.creative} />
                <StatBar label="무대" value={c.visibleStats.stage} />
                <StatBar label="스타" value={c.visibleStats.star} />
                <StatBar label="프로" value={c.visibleStats.pro} />
              </div>
              <div className="tags mt8">{c.musicTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              <div className="mt8 xs"><Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag></div>
              <div className="mt8 xs dim">계약 부담 <span className="mono">{CONTRACT_PROFILES[c.contractProfileId]?.burden}</span></div>
              <div className="mt8"><Btn size="sm" variant="secondary" full onClick={() => go(`/audition/candidate/${id}`)}>DETAIL</Btn></div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
