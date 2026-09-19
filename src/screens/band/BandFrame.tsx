// BAND HUB frame (IA §7): first screen principle = CURRENT LINEUP, not the roster. Sub areas: LINEUP / MEMBERS / CHEMISTRY / SONGS.
import type { ReactNode } from 'react';
import { useSave } from '@/state/store';
import { Panel } from '@/components/Panel';
import { SubTabs } from '@/components/ui';

export function BandFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const save = useSave();
  return (
    <Panel title="BAND" subtitle={save.band.name ?? 'PLAYER BAND · (이름 미정)'} nav="close" flush footer={footer}>
      <SubTabs tabs={[
        { label: 'LINEUP', to: '/band', end: true },
        { label: 'MEMBERS', to: '/band/members', end: true },
        { label: 'CHEMISTRY', to: '/band/chemistry' },
        { label: 'SONGS', to: '/band/songs' },
      ]} />
      <div style={{ padding: '12px var(--gutter) 24px' }}>{children}</div>
    </Panel>
  );
}
