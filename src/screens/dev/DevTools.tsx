// DEV TOOLS (prototype QA only, not part of the IA). Reachable at /dev; never linked from game UI.
// Holds the diagnostics toggle (asset keys + implementation notes) and the manual test presets.
import { useState } from 'react';
import { useGameStore } from '@/state/store';
import { useDevStore } from '@/state/devStore';
import { PRESETS, applyPreset } from '@/state/devPresets';
import { ROUTES } from '@/app/routes';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, Section, Tag } from '@/components/ui';

export function DevToolsScreen() {
  const save = useGameStore((s) => s.save);
  const resetSave = useGameStore((s) => s.resetSave);
  const diagnostics = useDevStore((s) => s.diagnostics);
  const toggle = useDevStore((s) => s.toggleDiagnostics);
  const { go } = useGameNav();
  const [showJson, setShowJson] = useState(false);

  const run = (id: (typeof PRESETS)[number]['id']) => {
    const route = applyPreset(id);
    go(route, { replace: true });
  };

  return (
    <Panel title="DEV TOOLS" subtitle="QA only" nav="back">
      <Section title="Diagnostics">
        <div className="rowcard">
          <span className="grow">
            <div className="rowcard__title">Asset keys / dev notes</div>
            <div className="rowcard__meta">게임 화면에 [PLACEHOLDER_KEY]와 구현 메모를 표시한다</div>
          </span>
          <Btn size="sm" variant={diagnostics ? 'primary' : 'secondary'} onClick={toggle}>{diagnostics ? 'ON' : 'OFF'}</Btn>
        </div>
      </Section>

      <Section title="World">
        <button className="rowcard rowcard--tap" onClick={() => go('/dev/world')}>
          <span className="grow">
            <div className="rowcard__title">ISOMETRIC WORLD LAB</div>
            <div className="rowcard__meta">grid / footprint / depth / camera 검수</div>
          </span>
          <span className="rowcard__chev">›</span>
        </button>
      </Section>

      <Section title="Test presets">
        {PRESETS.map((p) => (
          <div key={p.id} className="rowcard rowcard--stack">
            <div className="rowcard__title">{p.label}</div>
            <div className="rowcard__meta mt8">{p.description}</div>
            <div className="row row--between mt12">
              <span className="mono label faint">{p.route}</span>
              <Btn size="sm" variant="amber" onClick={() => run(p.id)}>APPLY</Btn>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Save">
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => { resetSave(); go('/start', { replace: true }); }}>RESET SAVE</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowJson((v) => !v)}>{showJson ? 'HIDE JSON' : 'SHOW JSON'}</Btn>
        </div>
        {showJson && (
          <pre className="mono" style={{ fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 320, overflow: 'auto', background: 'var(--c-charcoal)', padding: 10, marginTop: 10 }}>
            {save ? JSON.stringify(save, null, 1) : 'no save'}
          </pre>
        )}
      </Section>

      <Section title="Routes">
        {ROUTES.map((r) => (
          <button key={r.path} className="rowcard rowcard--tap" onClick={() => go(r.path.replace(':id', 'C01'))}>
            <span className="mono label grow">{r.path}</span>
            <span className="label faint">{r.meta.layer}</span>
            <Tag tone={r.meta.status === 'implemented' ? 'ok' : 'mute'}>{r.meta.status}</Tag>
          </button>
        ))}
      </Section>
    </Panel>
  );
}
