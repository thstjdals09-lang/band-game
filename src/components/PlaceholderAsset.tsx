// Renders a registered asset, or an explicit [PLACEHOLDER_KEY] box when no art exists yet.
// Never "fakes" the art with CSS drawings (Visual Bible: no improvised visuals).
import { placeholderLabel, resolveAsset, type AssetKey } from '@/assets/registry';

export type PlaceholderVariant = 'env' | 'thumb' | 'bust' | 'full' | 'fill' | 'none';

interface Props {
  assetKey: AssetKey;
  variant?: PlaceholderVariant;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function PlaceholderAsset({ assetKey, variant = 'none', className = '', alt, style }: Props) {
  const url = resolveAsset(assetKey);
  const cls = `ph ${variant !== 'none' ? `ph--${variant}` : ''} ${className}`.trim();
  return (
    <div className={cls} style={style} data-asset={assetKey}>
      {url ? <img src={url} alt={alt ?? assetKey} /> : <span className="ph__label">{placeholderLabel(assetKey)}</span>}
    </div>
  );
}
