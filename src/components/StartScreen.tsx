
import React, { useState } from 'react';
import { MIN_PLAYERS, MAX_PLAYERS } from '../constants';

interface StartScreenProps {
  onStart: (playerCount: number) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState<number>(4);

  const handlePlayerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    if (count >= MIN_PLAYERS && count <= MAX_PLAYERS) {
      setPlayerCount(count);
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center w-full max-w-sm border border-gray-700">
      <h1 className="text-4xl font-bold text-yellow-400 mb-6">CACHO</h1>
      <div className="mb-6">
        <label htmlFor="player-count" className="block text-lg font-medium text-gray-300 mb-2">
          Número de Jugadores
        </label>
        <input
          type="number"
          id="player-count"
          value={playerCount}
          onChange={handlePlayerCountChange}
          min={MIN_PLAYERS}
          max={MAX_PLAYERS}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>
      <button
        onClick={() => onStart(playerCount)}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-lg text-xl transition-transform transform hover:scale-105"
      >
        Crear Sala e Iniciar
      </button>
    </div>
  );
};

export default StartScreen;