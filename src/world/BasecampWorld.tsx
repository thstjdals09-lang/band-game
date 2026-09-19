// React wrapper: SaveData -> scene -> active WorldView. Hotspot/actor taps become navigation.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSave } from '@/state/store';
import { ACTIVE_WORLD_VIEW, buildBasecampScene, worldViewRegistry, type WorldActor, type WorldMode } from './index';

interface Props {
  mode?: WorldMode;
  interactive?: boolean;
}

export function BasecampWorld({ mode = 'home', interactive = true }: Props) {
  const save = useSave();
  const navigate = useNavigate();
  const scene = useMemo(() => buildBasecampScene(save, mode), [save, mode]);
  const View = worldViewRegistry[ACTIVE_WORLD_VIEW];

  const onSelectActor = (a: WorldActor) => {
    if (!interactive) return;
    if (a.kind === 'character') navigate(`/?member=${a.id}`); // Member Quick View (bottom sheet on HOME)
    else navigate('/band');
  };

  return (
    <View
      scene={scene}
      onSelectActor={onSelectActor}
      onSelectHotspot={interactive ? (h) => navigate(h.target) : undefined}
    />
  );
}
