// NEW GAME / PRODUCER NAME (IA §26): no long character creation - producer name only, then Basecamp.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/state/store';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, Todo } from '@/components/ui';

export function NewGameScreen() {
  const save = useGameStore((s) => s.save);
  const newGame = useGameStore((s) => s.newGame);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const start = () => {
    newGame(name);
    navigate('/', { replace: true });
  };

  return (
    <div className="imm">
      <div className="imm__stage" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <PlaceholderAsset assetKey="TITLE_ART" variant="env" />
          <h1 className="mt16" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontSize: 22 }}>BAND MANAGEMENT GAME</h1>
          <p className="dim small">MOBILE UX PROTOTYPE · PHASE 1 APP SHELL</p>
        </div>
      </div>
      <div className="imm__bottom col">
        {save && !confirmReset && (
          <>
            <Btn variant="primary" full onClick={() => navigate('/', { replace: true })}>CONTINUE · {save.player.producerName}</Btn>
            <Btn variant="ghost" full onClick={() => setConfirmReset(true)}>NEW GAME (현재 세이브 삭제)</Btn>
          </>
        )}
        {(!save || confirmReset) && (
          <form className="col" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <label className="xs caps dim" htmlFor="producer">PRODUCER NAME</label>
            <input id="producer" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="프로듀서 이름" maxLength={16} autoFocus />
            <Btn variant="primary" full type="submit">START</Btn>
            {confirmReset && <Btn variant="ghost" full onClick={() => setConfirmReset(false)}>CANCEL</Btn>}
          </form>
        )}
        <Todo>밴드 이름은 여기서 정하지 않는다 - 핵심 멤버 2명 영입 후 EVT_BAND_NAME 이벤트에서 정한다 (IA §26).</Todo>
      </div>
    </div>
  );
}
