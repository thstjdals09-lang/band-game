// Placeholder screen for long-term features. Player-facing copy only - the IA placement note
// is a developer diagnostic and is hidden unless diagnostics are on.
import { Panel } from './Panel';
import { DevNote, EmptyState } from './ui';

interface Props {
  title: string;
  iaLocation: string;
  initialState: string;
  description?: string;
  nav?: 'back' | 'close';
}

export function FutureShell({ title, iaLocation, initialState, description, nav = 'back' }: Props) {
  return (
    <Panel title={title} subtitle="준비 중" nav={nav}>
      <EmptyState text={description ?? '이 기능은 아직 열리지 않았다. 밴드가 자리를 잡으면 여기에서 확인할 수 있다.'} />
      <DevNote>{iaLocation} · {initialState}</DevNote>
    </Panel>
  );
}
