import React from 'react';
import type { DiceValue, Player, Bet } from '../types';
import Dice from './Dice';
import HiddenDice from './HiddenDice';

interface DiceTrayProps {
  player: Player;
  isCurrent: boolean;
  isRevealing: boolean;
  isBlindRound?: boolean;
  isStarter?: boolean;
  currentBet: Bet | null;
  animatedCount: number;
  countBeforeReveal: number;
  forcedDiceReveal: DiceValue[] | null;
}

const DiceTray: React.FC<DiceTrayProps> = ({ player, isCurrent, isRevealing, isBlindRound, isStarter, currentBet, animatedCount, countBeforeReveal, forcedDiceReveal }) => {
  
  const renderDiceContent = () => {
    if (forcedDiceReveal) {
        return forcedDiceReveal.map((value, index) => <Dice key={`forced-${index}`} value={value} size="md" />);
    }
      
    // A player's dice are hidden if it's a blind round, they are not the starter, AND they have more than one die.
    if (isBlindRound && !isStarter && player.diceCount > 1 && !isRevealing) {
        return Array.from({ length: player.diceCount }).map((_, i) => <HiddenDice key={i} size="md" />);
    }
      
    const diceToShow = player.dice;

    if (isRevealing && currentBet) {
        const betIsOnAces = currentBet.face === 1;
        let relevantDiceCountSoFar = 0;

        return diceToShow.map((value, index) => {
            const isRelevant = value === currentBet.face || (!betIsOnAces && value === 1);
            
            if (isRelevant) {
                relevantDiceCountSoFar++;
            }
            
            // A die is highlighted if it's relevant and the global animated counter has passed its specific position in the count.
            const isHighlighted = isRelevant && (countBeforeReveal + relevantDiceCountSoFar <= animatedCount);

            return <Dice key={index} value={value} size="md" isHighlighted={isHighlighted} />;
        });
    }

    return diceToShow.map((value, index) => <Dice key={index} value={value} size="md" />);
  };

  const highlightClass = isCurrent ? 'ring-4 ring-yellow-400' : 'ring-2 ring-gray-600';
  const eliminatedClass = player.isEliminated ? 'opacity-40 grayscale' : '';

  return (
    <div className={`w-full max-w-lg flex flex-col items-center gap-2 p-3 bg-gray-800/70 rounded-lg border transition-all duration-300 ${highlightClass} ${eliminatedClass}`}>
       <div className="flex items-center gap-4">
        <h3 className="font-bold text-xl flex items-center gap-2">
            <span>{player.name}</span>
            {player.hasBonusLife && <span className="text-yellow-400" title="Vida Extra">⭐</span>}
        </h3>
        <div className="flex items-center gap-2 text-md bg-gray-900 px-3 py-1 rounded-full">
            <span>🎲</span>
            <span>{player.diceCount} {player.diceCount === 1 ? 'Dado' : 'Dados'}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 p-2 min-h-[56px]">
        {renderDiceContent()}
      </div>
    </div>
  );
};

export default DiceTray;