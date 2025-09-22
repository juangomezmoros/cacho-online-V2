C:\Users\hp\Documents\AI cositas\cacho-juego\cacho---juego-de-dados>type src\components\GameBoard.tsx
import React, { useState, useEffect } from 'react';
import type { GameState, DiceValue, Player, Bet } from '../types';
import PlayerSeat from './PlayerSeat';
import BettingPanel from './BettingPanel';
import DiceTray from './DiceTray';
import Dice from './Dice';
import { GameStatus, RevealType } from '../types';
import { countForFace } from '../utils/gameLogic';

interface GameBoardProps {
  gameState: GameState;
  onSetDirection: (direction: 'RIGHT' | 'LEFT') => void;
  onPlaceBet: (quantity: number, face: DiceValue) => void;
  onDoubtBet: () => void;
  onSpotOnBet: () => void;
  onSalpicon: () => void;
}

const getOpponentPositions = (count: number): React.CSSProperties[] => {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
  };

  const positions: { [key: number]: React.CSSProperties[] } = {
    1: [{ top: '15%', left: '50%' }],
    2: [{ top: '20%', left: '25%' }, { top: '20%', left: '75%' }],
    3: [{ top: '45%', left: '15%' }, { top: '15%', left: '50%' }, { top: '45%', left: '85%' }],
    4: [{ top: '45%', left: '15%' }, { top: '20%', left: '35%' }, { top: '20%', left: '65%' }, { top: '45%', left: '85%' }],
    5: [{ top: '45%', left: '15%' }, { top: '20%', left: '30%' }, { top: '15%', left: '50%' }, { top: '20%', left: '70%' }, { top: '45%', left: '85%' }],
  };

  const selectedPositions = positions[count] || [];
  return selectedPositions.map(pos => ({ ...baseStyle, ...pos }));
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onSetDirection, onPlaceBet, onDoubtBet, onSpotOnBet, onSalpicon }) => {
  const { status, players, currentPlayerIndex, roundStarterIndex, currentBet, previousBet, message, roundResult, winner, revealState, revealOrder, revealType, playDirection, totalDiceInPlay, isBlindRound, revealedSalpiconPlayerId } = gameState;
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    if (status === GameStatus.Reveal && revealState && currentBet) {
        if (animatedCount < revealState.revealedCount) {
             const timer = setTimeout(() => {
                setAnimatedCount(c => c + 1);
            }, 80); // Speed of the counter tick
            return () => clearTimeout(timer);
        }
    } else if (status !== GameStatus.Reveal) {
        setAnimatedCount(0);
    }
  }, [status, revealState, animatedCount, players, currentBet]);

  const humanPlayer = players.find(p => p.id === 0);
  const opponents = players.filter(p => p.id !== 0);
  const opponentPositions = getOpponentPositions(opponents.length);
  const isHumanTurn = players[currentPlayerIndex]?.id === 0 && (status === GameStatus.InProgress || status === GameStatus.AwaitingDirection);

  const countsBeforeMap = new Map<number, number>();
  if (status === GameStatus.Reveal && revealOrder && currentBet) {
      let cumulativeCount = 0;
      for (const playerIndex of revealOrder) {
          const player = players[playerIndex];
          if(player) {
              countsBeforeMap.set(player.id, cumulativeCount);
              if (!player.isEliminated) {
                cumulativeCount += countForFace(player.dice, currentBet.face, currentBet.face === 1);
              }
          }
      }
  }

  const renderRoundResult = () => {
    if (!roundResult) return null;

    const actionTaker = players.find(p => p.id === roundResult.actionTakerId);
    const betPlayer = players.find(p => p.id === roundResult.betPlayerId);

    const bonusLifePlayer = players.find(p => p.id === roundResult.bonusLifeUsedBy);
    if (bonusLifePlayer) {
        return (
            <>
                 <h2 className="text-lg font-semibold text-yellow-300">┬íVida Extra!</h2>
                 <p className="text-xl mt-2 text-cyan-300">
                    {bonusLifePlayer.name} us├│ una vida extra y no pierde un dado.
                 </p>
            </>
        )
    }

    if (roundResult.type === RevealType.SalpiconDoubt) {
        const salpiconResultText = roundResult.actualCount === 5 ? "S├ì ten├¡a Salpic├│n." : `NO ten├¡a Salpic├│n (ten├¡a ${roundResult.actualCount} caras ├║nicas).`;
        return (
            <>
                <h2 className="text-lg font-semibold text-yellow-300">Resultado de Duda a Salpic├│n</h2>
                <p className="text-xl mt-2">
                    {betPlayer?.name} {salpiconResultText}
                </p>
                <p className={`text-xl mt-2 ${roundResult.isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                    {actionTaker?.name} {roundResult.isSuccess ? 'acert├│ al dudar.' : 'se equivoc├│ al dudar.'}
                </p>
                 <p className="text-lg mt-1">
                    {players.find(p => p.id === roundResult.loserId)?.name} pierde un dado.
                </p>
            </>
        );
    }

    const betForDisplay = currentBet ?? previousBet;
    if (!betForDisplay && status !== GameStatus.RoundOver) return null;

    if (roundResult.type === RevealType.SpotOn) {
        return (
            <>
                <h2 className="text-lg font-semibold text-yellow-300">Resultado de la Caza</h2>
                <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                    Hab├¡a <span className="text-yellow-400">{roundResult.actualCount}</span>
                    <Dice value={betForDisplay!.face} size="sm" />
                </div>
                <p className={`text-xl mt-2 ${roundResult.isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                    {actionTaker?.name} {roundResult.isSuccess ? 'acert├│ al cazar.' : 'se equivoc├│ al cazar.'}
                </p>
                <p className="text-lg mt-1">
                    {roundResult.isSuccess ? `${players.find(p => p.id === roundResult.gainerId)?.name} gana un dado o vida.` : `${players.find(p => p.id === roundResult.loserId)?.name} pierde un dado.`}
                </p>
            </>
        );
    }

    return (
        <>
            <h2 className="text-lg font-semibold text-yellow-300">Resultado de la Duda</h2>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                Hab├¡a <span className="text-yellow-400">{roundResult.actualCount}</span>
                <Dice value={betForDisplay!.face} size="sm" />
            </div>
            <p className={`text-xl mt-2 ${roundResult.isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {actionTaker?.name} {roundResult.isSuccess ? 'acert├│ al dudar.' : 'se equivoc├│ al dudar.'}
            </p>
            <p className="text-lg mt-1">
                {players.find(p => p.id === roundResult.loserId)?.name} pierde un dado.
            </p>
        </>
    );
  };

  return (
    <div className="relative w-full h-full max-w-7xl max-h-[1024px] bg-green-800 rounded-full border-8 border-yellow-700 shadow-2xl p-8 text-white">
      {/* Total Dice Indicator */}
      <div className="absolute top-6 left-6 bg-green-900/50 p-2 rounded-lg text-center shadow-lg">
          <div className="text-xs font-bold uppercase tracking-wider text-yellow-400">Dados en Juego</div>
          <div className="text-3xl font-bold text-white">{totalDiceInPlay}</div>
      </div>

      {opponents.map((player, index) => {
        const playerIndexInPlayersArray = players.findIndex(p => p.id === player.id);
        const playerPositionInRevealOrder = revealOrder?.findIndex(idx => idx === playerIndexInPlayersArray) ?? -1;
        const currentlyRevealingPlayerIndexInRevealOrder = revealState?.playerIndex ?? -1;

        const isRevealing = status === GameStatus.Reveal && playerPositionInRevealOrder !== -1 && playerPositionInRevealOrder <= currentlyRevealingPlayerIndexInRevealOrder;
        const isBeingCounted = isRevealing && playerPositionInRevealOrder === currentlyRevealingPlayerIndexInRevealOrder;
        const countBeforeReveal = countsBeforeMap.get(player.id) ?? 0;

        return (
         <PlayerSeat
            key={player.id}
            player={player}
            isCurrent={player.id === players[currentPlayerIndex]?.id}
            isRevealing={isRevealing}
            isBeingCounted={isBeingCounted}
            currentBet={currentBet}
            style={opponentPositions[index]}
            animatedCount={animatedCount}
            countBeforeReveal={countBeforeReveal}
            forcedDiceReveal={player.id === revealedSalpiconPlayerId ? player.dice : null}
          />
        );
      })}

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center p-6 bg-green-900/50 rounded-lg min-h-[150px] w-1/2">
        {(status === GameStatus.InProgress || status === GameStatus.Reveal) && players.length > 2 && (
            <div className="absolute top-2 right-2 text-gray-400 text-sm flex items-center gap-1">
                <span>Direcci├│n:</span>
                <span className="font-bold text-lg">{playDirection === 'RIGHT' ? 'ÔåÆ' : 'ÔåÉ'}</span>
            </div>
        )}
        {status === GameStatus.Reveal && currentBet && players[currentPlayerIndex] && (
            <div className="animate-fade-in">
                <h2 className="text-lg font-semibold text-yellow-300 flex items-center justify-center gap-2">
                    {players[currentPlayerIndex].name} {revealType === RevealType.Doubt ? 'dud├│' : 'caz├│'} {currentBet.quantity} x <Dice value={currentBet.face} size="sm"/>
                </h2>
                <p className="text-5xl font-bold text-white mt-2">{animatedCount}</p>
                 <p className="text-md text-gray-200 mt-2 h-6">{revealState?.message}</p>
            </div>
        )}
        {status === GameStatus.InProgress && currentBet && (
          <>
            {currentBet.isSalpicon ? (
                 <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-orange-400">┬íSALPIC├ôN!</h2>
                    <p className="text-lg mt-1">de {players.find(p => p.id === currentBet.playerId)?.name}</p>
                    {previousBet && (
                        <div className="mt-4 border-t border-green-700 pt-2 text-sm text-gray-300">
                            <span className="font-light">Apuesta a superar: </span>
                            <div className="flex items-center justify-center gap-2 font-bold text-white">
                                <span>{previousBet.quantity} x </span>
                                <Dice value={previousBet.face} size="sm" />
                            </div>
                        </div>
                    )}
                 </div>
            ) : (
                <>
                    <h2 className="text-lg font-semibold text-yellow-300">Apuesta Actual</h2>
                    <div className="flex items-center justify-center gap-3">
                    <p className="text-3xl font-bold">{currentBet.quantity} x</p>
                    <Dice value={currentBet.face} size="md" />
                    </div>
                    <p className="text-sm text-gray-300">de {players.find(p => p.id === currentBet.playerId)?.name}</p>
                </>
            )}
          </>
        )}
        {(status === GameStatus.RoundOver || status === GameStatus.GameOver) && (
           <div className="animate-fade-in">
             {renderRoundResult()}
           </div>
        )}
        {status === GameStatus.GameOver && winner && (
          <div className="animate-fade-in mt-4">
            <h2 className="text-2xl font-bold text-yellow-400">┬íFin del Juego!</h2>
            <p className="text-xl">{winner.name} ha ganado la partida.</p>
          </div>
        )}
        <p className="text-md text-gray-200 mt-4 h-6">{(status === GameStatus.InProgress || status === GameStatus.AwaitingDirection) ? message : ''}</p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 flex flex-col items-center gap-4">
        {humanPlayer && (() => {
            const playerIndexInPlayersArray = players.findIndex(p => p.id === humanPlayer.id);
            const playerPositionInRevealOrder = revealOrder?.findIndex(idx => idx === playerIndexInPlayersArray) ?? -1;
            const currentlyRevealingPlayerIndexInRevealOrder = revealState?.playerIndex ?? -1;
            const isRevealing = status === GameStatus.Reveal && playerPositionInRevealOrder !== -1 && playerPositionInRevealOrder <= currentlyRevealingPlayerIndexInRevealOrder;
            const countBeforeReveal = countsBeforeMap.get(humanPlayer.id) ?? 0;
            const isStarter = roundStarterIndex !== null && players[roundStarterIndex]?.id === 0;

            return (
               <DiceTray
                player={humanPlayer}
                isCurrent={humanPlayer.id === players[currentPlayerIndex]?.id}
                isRevealing={isRevealing}
                isBlindRound={isBlindRound}
                isStarter={isStarter}
                currentBet={currentBet}
                animatedCount={animatedCount}
                countBeforeReveal={countBeforeReveal}
                forcedDiceReveal={humanPlayer.id === revealedSalpiconPlayerId ? humanPlayer.dice : null}
              />
            );
        })()}

        {(status === GameStatus.InProgress || status === GameStatus.AwaitingDirection || status === GameStatus.Reveal) ? (
            <BettingPanel
                currentBet={currentBet}
                previousBet={previousBet}
                playerDiceCount={humanPlayer?.diceCount ?? 0}
                status={status}
                onSetDirection={onSetDirection}
                onPlaceBet={onPlaceBet}
                onDoubtBet={onDoubtBet}
                onSpotOnBet={onSpotOnBet}
                onSalpicon={onSalpicon}
                disabled={!isHumanTurn}
            />
        ) : (
            <div className="h-[148px] flex items-center justify-center">
                 { (status === GameStatus.RoundOver) && (
                    <p className="text-xl font-bold text-gray-300 animate-pulse">
                        Iniciando siguiente ronda...
                    </p>
                 )}
                 { (status === GameStatus.GameOver) && (
                     <p className="text-2xl font-bold text-yellow-300">El juego ha terminado.</p>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
C:\Users\hp\Documents\AI cositas\cacho-juego\cacho---juego-de-dados>
