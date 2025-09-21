import React from 'react';
import type { DiceValue } from '../types';

interface DiceProps {
  value: DiceValue;
  size?: 'sm' | 'md' | 'lg';
  isHighlighted?: boolean;
}

const Dot: React.FC<{ gridArea: string }> = ({ gridArea }) => (
  <div
    className="w-full h-full bg-white rounded-full"
    style={{ gridArea }}
  />
);

const Dice: React.FC<DiceProps> = ({ value, size = 'md', isHighlighted = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1',
    md: 'w-10 h-10 p-1.5',
    lg: 'w-16 h-16 p-2.5',
  };
  
  const highlightClasses = isHighlighted ? 'ring-4 ring-green-400 shadow-lg shadow-green-500/50' : '';

  const dotPatterns: { [key in DiceValue]: React.ReactNode } = {
    1: <Dot gridArea="b2" />,
    2: <><Dot gridArea="a1" /><Dot gridArea="c3" /></>,
    3: <><Dot gridArea="a1" /><Dot gridArea="b2" /><Dot gridArea="c3" /></>,
    4: <><Dot gridArea="a1" /><Dot gridArea="a3" /><Dot gridArea="c1" /><Dot gridArea="c3" /></>,
    5: <><Dot gridArea="a1" /><Dot gridArea="a3" /><Dot gridArea="b2" /><Dot gridArea="c1" /><Dot gridArea="c3" /></>,
    6: <><Dot gridArea="a1" /><Dot gridArea="a3" /><Dot gridArea="b1" /><Dot gridArea="b3" /><Dot gridArea="c1" /><Dot gridArea="c3" /></>,
  };

  return (
    <div
      className={`bg-red-600 rounded-md border-2 border-red-800 shadow-md transition-all duration-300 ${sizeClasses[size]} ${highlightClasses}`}
      aria-label={`Dado mostrando ${value}`}
      role="img"
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateAreas: `
            "a1 a2 a3"
            "b1 b2 b3"
            "c1 c2 c3"
          `,
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        }}
      >
        {dotPatterns[value]}
      </div>
    </div>
  );
};

export default Dice;