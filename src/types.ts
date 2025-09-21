// Implemented full type definitions for the game state, players, bets, and status.
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface Player {
  id: number;
  name: string;
  dice: DiceValue[];
  diceCount: number;
  isEliminated: boolean;
  hasBonusLife: boolean;
}

export interface Bet {
  playerId: number;
  quantity: number;
  face: DiceValue;
  isSalpicon?: true;
}

export enum GameStatus {
  Setup = 'SETUP',
  AwaitingDirection = 'AWAITING_DIRECTION',
  InProgress = 'IN_PROGRESS',
  Reveal = 'REVEAL', // State for animating the dice count
  RoundOver = 'ROUND_OVER',
  GameOver = 'GAME_OVER',
}

export enum RevealType {
  Doubt = 'DOUBT',
  SpotOn = 'SPOT_ON', // "Cazar"
  SalpiconDoubt = 'SALPICON_DOUBT',
}

export interface RevealState {
  playerIndex: number; // This is now an index for the revealOrder array
  revealedCount: number;
  message: string;
}

export interface RoundResult {
    type: RevealType;
    isSuccess: boolean;
    actionTakerId: number;
    betPlayerId: number;
    loserId?: number; // The player who loses a die
    gainerId?: number; // The player who gains a die
    actualCount: number;
    bonusLifeUsedBy?: number; // ID of player who used a bonus life
}


export interface GameState {
  status: GameStatus;
  playDirection: 'RIGHT' | 'LEFT';
  players: Player[];
  totalDiceInPlay: number;
  currentPlayerIndex: number;
  roundStarterIndex: number | null;
  currentBet: Bet | null;
  previousBet: Bet | null; // Stores the bet before a Salpicon
  isBlindRound?: boolean;
  roundResult: RoundResult | null;
  winner: Player | null;
  message: string;
  revealState: RevealState | null;
  revealOrder: number[] | null; // Array of player indices in the order they should be revealed
  revealType: RevealType | null;
  revealedSalpiconPlayerId: number | null; // ID of player whose dice are shown after a salpicon doubt
}