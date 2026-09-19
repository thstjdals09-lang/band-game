// NEW GAME (IA §26): no long character creation - producer name only, then Basecamp.
// The band name is NOT entered here; it is decided in the Band Name Event after two members join.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/state/store';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn } from '@/components/ui';

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
      <div className="imm__stage">
        <div className="imm__scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
          <PlaceholderAsset assetKey="TITLE_ART" variant="env" kind="scene" />
          <div>
            <h1 className="step__title">밴드 육성게임</h1>
            <p className="dim meta mt8">작은 지하 연습실에서 시작한다.</p>
          </div>
        </div>
      </div>
      <div className="imm__bottom">
        {save && !confirmReset && (
          <>
            <Btn variant="primary" size="lg" full onClick={() => navigate('/', { replace: true })}>이어하기 · {save.player.producerName}</Btn>
            <Btn variant="ghost" full onClick={() => setConfirmReset(true)}>새로 시작하기</Btn>
          </>
        )}
        {(!save || confirmReset) && (
          <form className="col" onSubmit={(e) => { e.preventDefault(); start(); }}>
            {confirmReset && <div className="notice notice--warn">새로 시작하면 지금 진행 중인 기록이 사라진다.</div>}
            <label className="label dim" htmlFor="producer">프로듀서 이름</label>
            <input id="producer" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" maxLength={16} autoFocus />
            <Btn variant="primary" size="lg" full type="submit">START</Btn>
            {confirmReset && <Btn variant="ghost" full onClick={() => setConfirmReset(false)}>취소</Btn>}
          </form>
        )}
      </div>
    </div>
  );
}
