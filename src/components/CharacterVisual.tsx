// Character visual = derived from the full-body sprite (Visual Bible: Portrait 파생 규칙).
// Until sprites exist this shows a neutral figure silhouette, never a key string.
import { characterAssetKey, sessionAssetKey } from '@/assets/registry';
import { PlaceholderAsset } from './PlaceholderAsset';

interface Props {
  id: string; // CharacterId or 'SESSION'
  variant?: 'FULL' | 'BUST' | 'THUMB';
  className?: string;
  fill?: boolean;
  /** 세션 자리에만 쓴다. 같은 seed는 항상 같은 얼굴로 보인다 (세션 instanceId나 템플릿 id). */
  seed?: string | number;
}

export function CharacterVisual({ id, variant = 'THUMB', className, fill, seed }: Props) {
  const key = id === 'SESSION'
    ? sessionAssetKey(seed, variant === 'THUMB' ? 'THUMB' : 'FULL')
    : characterAssetKey(id, variant);
  const v = fill ? 'fill' : variant === 'FULL' ? 'full' : variant === 'BUST' ? 'bust' : 'thumb';
  return <PlaceholderAsset assetKey={key} variant={v} kind="character" className={className} />;
}
