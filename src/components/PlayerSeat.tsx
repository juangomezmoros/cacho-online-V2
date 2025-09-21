import React from 'react';
import type { Player, Bet, DiceValue } from '../types';
import Dice from './Dice';
import HiddenDice from './HiddenDice';

interface PlayerSeatProps {
  player: Player;
  isCurrent: boolean;
  isRevealing: boolean;
  isBeingCounted: boolean;
  currentBet: Bet | null;
  style: React.CSSProperties;
  animatedCount: number;
  countBeforeReveal: number;
  forcedDiceReveal: DiceValue[] | null;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isCurrent, isRevealing, isBeingCounted, currentBet, style, animatedCount, countBeforeReveal, forcedDiceReveal }) => {
  
  const highlightClass = isCurrent ? 'ring-4 ring-yellow-400 shadow-lg' : 'ring-2 ring-gray-600';
  const countingClass = isBeingCounted ? 'bg-cyan-900/50 border-cyan-400' : 'border-gray-700';
  const eliminatedClass = player.isEliminated ? 'opacity-40 grayscale' : '';
  
  const renderDice = () => {
    if (player.isEliminated) {
        return <p className="text-red-500 font-bold">ELIMINADO</p>;
    }

    if (forcedDiceReveal) {
        return forcedDiceReveal.map((value, index) => <Dice key={`forced-${index}`} value={value} size="sm" />);
    }

    if (isRevealing && currentBet) {
        const betIsOnAces = currentBet.face === 1;
        let relevantDiceCountSoFar = 0;

        return player.dice.map((value, index) => {
            const isRelevant = value === currentBet.face || (!betIsOnAces && value === 1);
            
            if (isRelevant) {
                relevantDiceCountSoFar++;
            }

            // A die is highlighted if it's relevant and the global animated counter has passed its specific position in the count.
            const isHighlighted = isRelevant && (countBeforeReveal + relevantDiceCountSoFar <= animatedCount);
            
            return <Dice key={`dice-${index}`} value={value} size="sm" isHighlighted={isHighlighted} />;
        });
    }

    return Array.from({ length: player.diceCount }).map((_, i) => <HiddenDice key={i} size="sm" />);
  };

  return (
    <div 
        style={style}
        className={`absolute flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-lg border transition-all duration-300 ${highlightClass} ${eliminatedClass} ${countingClass}`}>
      <h3 className="font-bold text-lg flex items-center gap-2">
        <span>{player.name}</span>
        {player.hasBonusLife && <span className="text-yellow-400" title="Vida Extra">⭐</span>}
      </h3>
      
      <div className="mt-1 flex flex-wrap gap-1 justify-center min-h-[36px]">
        {renderDice()}
      </div>
    </div>
  );
};

export default PlayerSeat;