// Renders a registered asset. When the art does not exist yet it renders a NEUTRAL frame
// (empty visual block, or a plain silhouette for characters) - never the registry key.
// The key is exposed as a data-asset attribute for tooling, and as visible text only while
// developer diagnostics are on (/dev).
import { placeholderLabel, resolveAsset, type AssetKey } from '@/assets/registry';
import { useDevDiagnostics } from '@/state/devStore';

export type PlaceholderVariant = 'env' | 'thumb' | 'bust' | 'full' | 'fill' | 'none';
export type PlaceholderKind = 'scene' | 'character' | 'object' | 'ui';

interface Props {
  assetKey: AssetKey;
  variant?: PlaceholderVariant;
  kind?: PlaceholderKind;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

/** Plain neutral figure - stands in for the HD pixel character sprite, never art direction. */
function FigureSilhouette() {
  return (
    <svg className="ph__figure" viewBox="0 0 40 64" aria-hidden focusable="false">
      <circle cx="20" cy="15" r="9" />
      <path d="M20 26c-8 0-13 5-14 13l-1 25h30l-1-25c-1-8-6-13-14-13z" />
    </svg>
  );
}

export function PlaceholderAsset({ assetKey, variant = 'none', kind = 'scene', className = '', alt, style }: Props) {
  const url = resolveAsset(assetKey);
  const dev = useDevDiagnostics();
  const cls = ['ph', variant !== 'none' ? `ph--${variant}` : '', `ph--${kind}`, className].filter(Boolean).join(' ');

  if (url) {
    return (
      <div className={cls} style={style} data-asset={assetKey}>
        <img src={url} alt={alt ?? ''} />
      </div>
    );
  }
  return (
    <div className={cls} style={style} data-asset={assetKey} role="presentation">
      {kind === 'character' && <FigureSilhouette />}
      {dev && <span className="ph__devkey">{placeholderLabel(assetKey)}</span>}
    </div>
  );
}
