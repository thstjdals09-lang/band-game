// SONGS (IA §17): 밴드의 작업 노트. 4-axis, genre, contributors, origin. Keep Demo / Release Single / Save for EP.
import { CHARACTERS } from '@/data/master';
import { useSave } from '@/state/store';
import { songList } from '@/state/selectors';
import { songActions } from '@/state/actions';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, EmptyState, StatBar, Tag, Todo } from '@/components/ui';
import { BandFrame } from './BandFrame';

export function SongsScreen() {
  const save = useSave();
  const songs = songList(save);
  return (
    <BandFrame>
      {songs.length === 0 && <EmptyState text="아직 곡이 없다. Practice / Recording 주간을 보내면 첫 데모가 태어난다." />}
      {songs.map((s) => (
        <div key={s.id} className="rowcard" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row row--between"><div className="rowcard__title">{s.title}</div><Tag tone={s.status === 'UNRELEASED' ? undefined : 'accent'}>{s.status}</Tag></div>
          <div className="rowcard__meta">W{s.createdWeek} · 작곡 {s.contributors.composer.map((c) => CHARACTERS[c].name).join(', ') || '-'} · 작사 {s.contributors.lyrics.map((c) => CHARACTERS[c].name).join(', ') || '-'}</div>
          <div className="tags mt8">{s.genreTags.map((g) => <Tag key={g}>{g}</Tag>)}{s.originContext.map((o) => <Tag key={o} tone="amber">{o}</Tag>)}</div>
          <div className="col mt8">
            <StatBar label="대중성" value={s.musicProfile.popularity} />
            <StatBar label="음악성" value={s.musicProfile.artistry} />
            <StatBar label="팬 적합" value={s.musicProfile.fanFit} />
            <StatBar label="라이브" value={s.musicProfile.liveFit} />
          </div>
          <PlaceholderAsset assetKey="AUDIO_PREVIEW_PLAYER" className="mt8" style={{ height: 44 }} />
          <div className="row mt8 wrap">
            <Btn size="sm" variant={s.status === 'DEMO' ? 'primary' : 'secondary'} onClick={() => songActions.setStatus(s.id, 'DEMO')}>KEEP DEMO</Btn>
            <Btn size="sm" variant={s.status === 'RELEASED_SINGLE' ? 'primary' : 'secondary'} onClick={() => songActions.setStatus(s.id, 'RELEASED_SINGLE')}>RELEASE SINGLE</Btn>
            <Btn size="sm" variant={s.status === 'SAVED_FOR_EP' ? 'primary' : 'secondary'} onClick={() => songActions.setStatus(s.id, 'SAVED_FOR_EP')}>SAVE FOR EP</Btn>
          </div>
        </div>
      ))}
      <Todo>10~20초 미리듣기 공간은 AUDIO_PREVIEW_PLAYER placeholder로 확보. 발매 전략의 실제 효과는 PHASE2.</Todo>
    </BandFrame>
  );
}
