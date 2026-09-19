// FACILITY BUILD confirm -> short Construction Reveal -> Basecamp returns expanded (IA §22, §25: cancel -> Facilities).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FACILITIES, PROTOTYPE_BALANCE } from '@/data/master';
import { useSave } from '@/state/store';
import { facilityAvailability } from '@/state/selectors';
import { facilityActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, EmptyState } from '@/components/ui';

export function FacilityBuildScreen() {
  const { id } = useParams();
  const save = useSave();
  const { go, back } = useGameNav();
  const def = id ? FACILITIES[id] : undefined;
  const [phase, setPhase] = useState<'CONFIRM' | 'CONSTRUCTING' | 'DONE'>('CONFIRM');

  useEffect(() => {
    if (phase !== 'CONSTRUCTING') return;
    const t = setTimeout(() => setPhase('DONE'), PROTOTYPE_BALANCE.facility.constructionRevealMs);
    return () => clearTimeout(t);
  }, [phase]);

  if (!def) return <Panel title="BUILD" nav="back"><EmptyState text="알 수 없는 시설" /></Panel>;
  const availability = facilityAvailability(save, def.id);
  const affordable = save.economy.cash >= def.buildCost;

  if (phase === 'CONSTRUCTING' || phase === 'DONE') {
    return (
      <div className="imm">
        <div className="imm__top"><span>CONSTRUCTION</span><span className="grow" /><span>{def.name}</span></div>
        <div className="imm__stage">
          <PlaceholderAsset assetKey={phase === 'DONE' ? 'BASECAMP_BG_STAGE2' : 'CONSTRUCTION_REVEAL'} variant="fill" />
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }} className="choice">
            <div className="choice__title">{phase === 'DONE' ? 'COMPLETE' : '공사 중…'}</div>
            <div className="choice__text">{phase === 'DONE' ? `${def.name}이(가) Basecamp에 추가되었다. HOME 자체가 확장된다.` : '잠긴 공간이 열리고 있다.'}</div>
          </div>
        </div>
        <div className="imm__bottom">
          <Btn variant="primary" full disabled={phase !== 'DONE'} onClick={() => go('/', { replace: true })}>RETURN TO EXPANDED BASECAMP</Btn>
        </div>
      </div>
    );
  }

  return (
    <Panel
      title="BUILD"
      subtitle={def.name}
      nav="back"
      footer={<><Btn variant="ghost" onClick={back}>CANCEL</Btn><Btn variant="amber" full disabled={availability !== 'AVAILABLE' || !affordable} onClick={() => { facilityActions.build(def.id, def.buildCost); setPhase('CONSTRUCTING'); }}>BUILD · {won(def.buildCost)}</Btn></>}
    >
      <p className="small">{def.description}</p>
      <dl className="kv mt12">
        <dt>비용</dt><dd>{won(def.buildCost)}</dd>
        <dt>건설 후 Cash</dt><dd>{won(save.economy.cash - def.buildCost)}</dd>
        <dt>효과</dt><dd>{def.effectSummary}</dd>
        <dt>Basecamp</dt><dd>Stage {def.basecampStageAfterBuild ?? '-'}</dd>
      </dl>
      {availability !== 'AVAILABLE' && <div className="warn mt12">아직 건설할 수 없다: {def.unlockCondition}</div>}
      {!affordable && <div className="warn warn--risk mt12">자금이 부족하다.</div>}
    </Panel>
  );
}
