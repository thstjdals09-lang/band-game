// App Shell: Basecamp world underneath, HUD on top, screen layer (panel / immersive) in between,
// 5-item Dock at the bottom. HOME has no dock item and none is active there (IA §3, §5).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGameStore } from '@/state/store';
import { BasecampWorld } from '@/world/BasecampWorld';
import { Hud } from '@/components/Hud';
import { Dock } from '@/components/Dock';
import { DevFab } from '@/components/DevAccess';
import { getRouteMeta } from './routes';
import { useNavHistoryTracker } from './navigation';

export function AppShell() {
  useNavHistoryTracker();
  const location = useLocation();
  const save = useGameStore((s) => s.save);
  const meta = getRouteMeta(location.pathname);

  if (meta.requiresSave !== false && !save) return <Navigate to="/start" replace />;

  const chrome = meta.layer !== 'immersive' && !!save;
  const layerCls = `screen-layer screen-layer--${meta.layer} ${chrome ? 'screen-layer--with-chrome' : ''}`;

  return (
    <div className="app">
      <div className="phone">
        {save && meta.layer !== 'immersive' && (
          <div className="world-layer" aria-hidden={meta.layer !== 'world'}>
            <BasecampWorld mode="home" interactive={meta.layer === 'world'} />
          </div>
        )}
        {chrome && <Hud />}
        <div className={layerCls}>
          <Outlet />
        </div>
        {chrome && <DevFab />}
        {chrome && <Dock active={meta.dock} />}
      </div>
    </div>
  );
}
