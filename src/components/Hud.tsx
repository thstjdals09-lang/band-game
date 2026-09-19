// Thin HUD: Week / Cash / Fans / Fame only (IA §5). No extra currencies or levels.
import { useSave } from '@/state/store';
import { weekLabel, won } from '@/app/format';

export function Hud() {
  const save = useSave();
  return (
    <div className="hud">
      <span className="hud__item">{weekLabel(save)}</span>
      <span className="hud__item"><span className="hud__label">CASH</span>{won(save.economy.cash)}</span>
      <span className="hud__item"><span className="hud__label">FANS</span>{save.band.metrics.fans}</span>
      <span className="hud__item"><span className="hud__label">FAME</span>{save.band.metrics.fame}</span>
      <span className="hud__band">{save.band.name ?? 'PLAYER BAND'}</span>
    </div>
  );
}
