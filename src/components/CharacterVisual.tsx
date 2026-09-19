// Character visual = derived from the full-body sprite (Visual Bible: Portrait 파생 규칙).
// Until sprites exist this shows a neutral figure silhouette, never a key string.
import { characterAssetKey } from '@/assets/registry';
import { PlaceholderAsset } from './PlaceholderAsset';

interface Props {
  id: string; // CharacterId or 'SESSION'
  variant?: 'FULL' | 'BUST' | 'THUMB';
  className?: string;
  fill?: boolean;
}

export function CharacterVisual({ id, variant = 'THUMB', className, fill }: Props) {
  const key = id === 'SESSION'
    ? (variant === 'THUMB' ? 'SESSION_MUSICIAN_THUMB' : 'SESSION_MUSICIAN_FULL')
    : characterAssetKey(id, variant);
  const v = fill ? 'fill' : variant === 'FULL' ? 'full' : variant === 'BUST' ? 'bust' : 'thumb';
  return <PlaceholderAsset assetKey={key} variant={v} kind="character" className={className} />;
}
