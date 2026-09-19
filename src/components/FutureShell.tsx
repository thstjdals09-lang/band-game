// Placeholder screen for long-term features (IA §24 장기 기능 Shell 배치 / GDD §09 껍데기 화면).
import { Panel } from './Panel';
import { Todo } from './ui';

interface Props {
  title: string;
  iaLocation: string;
  initialState: string;
  description?: string;
  nav?: 'back' | 'close';
}

export function FutureShell({ title, iaLocation, initialState, description, nav = 'back' }: Props) {
  return (
    <Panel title={title} subtitle={`${iaLocation} · ${initialState}`} nav={nav}>
      <div className="empty">
        <div className="caps small">{initialState}</div>
        <p className="mt8">{description ?? '후속 확장 기능. Vertical Slice에서는 route / 잠금 상태 / placeholder만 존재한다.'}</p>
      </div>
      <Todo>이 화면은 IA v1.1 §24 Shell 배치에 따라 구조만 존재한다. 실제 기능은 Local Act Chapter 이후.</Todo>
    </Panel>
  );
}
