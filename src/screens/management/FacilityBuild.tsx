// FACILITY BUILD confirm -> short Construction Reveal -> Basecamp returns expanded (IA §22, §25).
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
import { Btn, EmptyState, Notice } from '@/components/ui';

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

  if (!def) return <Panel title="건설" nav="back"><EmptyState text="알 수 없는 시설" /></Panel>;
  const availability = facilityAvailability(save, def.id);
  const affordable = save.economy.cash >= def.buildCost;

  if (phase === 'CONSTRUCTING' || phase === 'DONE') {
    return (
      <div className="imm">
        <div className="imm__top"><span className="strong">{phase === 'DONE' ? '완성' : '공사 중'}</span><span className="grow" /><span>{def.name}</span></div>
        <div className="imm__stage">
          <PlaceholderAsset assetKey={phase === 'DONE' ? 'BASECAMP_BG_STAGE2' : 'CONSTRUCTION_REVEAL'} variant="fill" kind="scene" />
          <div className="choice" style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
            <div className="choice__title">{phase === 'DONE' ? '새 공간' : '공사 중'}</div>
            <p className="choice__text">{phase === 'DONE'
              ? `${def.name}이 연습실 옆에 생겼다. 돌아가면 공간이 달라져 있다.`
              : '잠겨 있던 문이 열리고 있다.'}</p>
          </div>
        </div>
        <div className="imm__bottom">
          <Btn variant="primary" size="lg" full disabled={phase !== 'DONE'} onClick={() => go('/', { replace: true })}>넓어진 연습실 보기</Btn>
        </div>
      </div>
    );
  }

  return (
    <Panel
      title="건설"
      subtitle={def.name}
      nav="back"
      footer={
        <>
          <Btn variant="ghost" onClick={back}>취소</Btn>
          <Btn variant="amber" size="lg" full disabled={availability !== 'AVAILABLE' || !affordable}
            onClick={() => { facilityActions.build(def.id, def.buildCost); setPhase('CONSTRUCTING'); }}>
            {won(def.buildCost)} 들여 짓기
          </Btn>
        </>
      }
    >
      <p className="lead">{def.description}</p>
      <dl className="kv mt16">
        <dt>비용</dt><dd>{won(def.buildCost)}</dd>
        <dt>남는 자금</dt><dd>{won(save.economy.cash - def.buildCost)}</dd>
      </dl>
      <div className="rowcard rowcard--stack mt16">
        <div className="label dim caps">생기는 것</div>
        <div className="mt8">{def.effectSummary}</div>
      </div>
      {availability !== 'AVAILABLE' && <Notice tone="warn">아직 지을 수 없다. {def.unlockCondition}</Notice>}
      {!affordable && <Notice tone="risk">자금이 부족하다.</Notice>}
    </Panel>
  );
}
