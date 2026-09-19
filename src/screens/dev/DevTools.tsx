// DEV TOOLS (prototype only, not part of the IA). Reset save, dump state, jump to any route.
import { useGameStore } from '@/state/store';
import { ROUTES } from '@/app/routes';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, Section, Tag } from '@/components/ui';

export function DevToolsScreen() {
  const save = useGameStore((s) => s.save);
  const resetSave = useGameStore((s) => s.resetSave);
  const { go } = useGameNav();
  return (
    <Panel title="DEV TOOLS" subtitle="prototype only" nav="back">
      <div className="row">
        <Btn variant="secondary" size="sm" onClick={() => { resetSave(); go('/start', { replace: true }); }}>RESET SAVE</Btn>
        <Btn variant="ghost" size="sm" onClick={() => go('/start')}>TITLE</Btn>
      </div>
      <Section title="Routes">
        {ROUTES.map((r) => (
          <button key={r.path} className="rowcard rowcard--tap" onClick={() => go(r.path.replace(':id', 'C01'))}>
            <span className="mono xs grow" style={{ textAlign: 'left' }}>{r.path}</span>
            <span className="xs dim">{r.meta.layer}</span>
            <Tag tone={r.meta.status === 'implemented' ? 'ok' : undefined}>{r.meta.status}</Tag>
          </button>
        ))}
      </Section>
      <Section title="Save JSON">
        <pre className="mono xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto', background: 'var(--c-charcoal)', padding: 8 }}>
          {save ? JSON.stringify(save, null, 1) : 'no save'}
        </pre>
      </Section>
    </Panel>
  );
}
