import React, { useState, useEffect } from 'react';
import type { Bet, DiceValue } from '../types';
import { GameStatus } from '../types';
import Dice from './Dice';
import { isBetValid } from '../utils/gameLogic';

interface BettingPanelProps {
  currentBet: Bet | null;
  previousBet: Bet | null;
  playerDiceCount: number;
  status: GameStatus;
  onSetDirection: (direction: 'RIGHT' | 'LEFT') => void;
  onPlaceBet: (quantity: number, face: DiceValue) => void;
  onDoubtBet: () => void;
  onSpotOnBet: () => void;
  onSalpicon: () => void;
  disabled: boolean;
}

const BettingPanel: React.FC<BettingPanelProps> = ({ currentBet, previousBet, playerDiceCount, status, onSetDirection, onPlaceBet, onDoubtBet, onSpotOnBet, onSalpicon, disabled }) => {
  const [quantity, setQuantity] = useState(1);
  const [face, setFace] = useState<DiceValue>(1);
  const [validation, setValidation] = useState<{ ok: boolean; reason?: string }>({ ok: true });

  const betToBeat = currentBet?.isSalpicon ? previousBet : currentBet;

  useEffect(() => {
    if (betToBeat) {
      // Start with a valid bet suggestion
      setQuantity(betToBeat.quantity + 1);
      setFace(betToBeat.face);
    } else {
      setQuantity(1);
      setFace(1);
    }
  }, [currentBet, previousBet]); // Depend on both to react to salpicon

  useEffect(() => {
    const nextBet: Bet = { playerId: 0, quantity, face }; // playerId doesn't matter for validation
    const result = isBetValid(betToBeat, nextBet);
    setValidation(result);
  }, [quantity, face, betToBeat]);
  
  const handlePlaceBet = () => {
    if (validation.ok) {
        onPlaceBet(quantity, face);
    }
  };
  
  const handleQuantityChange = (amount: number) => {
    setQuantity(q => Math.max(1, q + amount));
  }

  const faces: DiceValue[] = [1, 2, 3, 4, 5, 6];

  const disabledClasses = disabled ? 'opacity-50 pointer-events-none' : '';
  
  if (status === GameStatus.AwaitingDirection) {
      return (
        <div className={`bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 w-full transition-opacity flex flex-col items-center justify-center gap-4 min-h-[148px] ${disabledClasses}`}>
            <h3 className="text-lg font-bold text-yellow-400">Elige la Dirección del Juego</h3>
            <div className="flex w-full gap-4">
                <button
                    onClick={() => onSetDirection('LEFT')}
                    disabled={disabled}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <span className="text-2xl">←</span> Izquierda
                </button>
                <button
                    onClick={() => onSetDirection('RIGHT')}
                    disabled={disabled}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Derecha <span className="text-2xl">→</span>
                </button>
            </div>
        </div>
      )
  }


  return (
    <div className={`bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 w-full transition-opacity min-h-[148px] ${disabledClasses}`}>
      <div className="flex justify-between items-center">
        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <label className="font-bold text-lg">Cantidad:</label>
          <button onClick={() => handleQuantityChange(-1)} disabled={disabled} className="bg-gray-700 w-10 h-10 rounded-full font-bold text-2xl disabled:bg-gray-600">-</button>
          <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
          <button onClick={() => handleQuantityChange(1)} disabled={disabled} className="bg-gray-700 w-10 h-10 rounded-full font-bold text-2xl disabled:bg-gray-600">+</button>
        </div>

        {/* Face Selection */}
        <div className="flex items-center gap-2">
            {faces.map(f => (
                <button key={f} onClick={() => setFace(f)} disabled={disabled} className={`transition-transform transform hover:scale-110 rounded-lg ${face === f ? 'ring-2 ring-yellow-400' : ''}`}>
                    <Dice value={f} size="md" />
                </button>
            ))}
        </div>
      </div>
      {!validation.ok && <p className="text-yellow-400 text-center mt-2 h-6">{validation.reason}</p>}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handlePlaceBet}
          disabled={!validation.ok || disabled}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Apostar
        </button>
        <button
          onClick={onSpotOnBet}
          disabled={!currentBet || disabled || !!currentBet?.isSalpicon}
          className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Cazar
        </button>
        <button
          onClick={onDoubtBet}
          disabled={!currentBet || disabled}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Dudar
        </button>
        <button
          onClick={onSalpicon}
          disabled={disabled || playerDiceCount !== 5}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Salpicón
        </button>
      </div>
    </div>
  );
};

export default BettingPanel;