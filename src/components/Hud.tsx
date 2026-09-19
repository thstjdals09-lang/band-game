// Thin HUD: Week / Cash / Fans / Fame only (IA §5). No extra currencies or levels.
import { useSave } from '@/state/store';
import { weekLabel, wonShort } from '@/app/format';
import { useSecretDevTap } from './DevAccess';

export function Hud() {
  const save = useSave();
  const devTap = useSecretDevTap();
  return (
    <div className="hud">
      <span className="hud__week" {...devTap}>{weekLabel(save)}</span>
      <span className="hud__item"><span className="hud__label">자금</span><span className="hud__value">{wonShort(save.economy.cash)}</span></span>
      <span className="hud__item"><span className="hud__label">팬</span><span className="hud__value">{save.band.metrics.fans}</span></span>
      <span className="hud__item"><span className="hud__label">명성</span><span className="hud__value">{save.band.metrics.fame}</span></span>
      <span className="hud__band">{save.band.name ?? ''}</span>
    </div>
  );
}
