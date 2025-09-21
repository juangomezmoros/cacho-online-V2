import React from 'react';

interface HiddenDiceProps {
  size?: 'sm' | 'md' | 'lg';
}

const HiddenDice: React.FC<HiddenDiceProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`bg-gray-600 rounded-md border-2 border-gray-500 ${sizeClasses[size]}`}>
    </div>
  );
};

export default HiddenDice;