import { useReducer, useEffect } from 'react';
import type { GameState, Player, DiceValue, Bet, RevealState, RoundResult } from '../types';
import { GameStatus, RevealType } from '../types';
import { INITIAL_DICE_COUNT } from '../constants';
import { rollDice, countForFace, decideBotAction } from '../utils/gameLogic';

type Action =
  | { type: 'START_GAME'; playerCount: number }
  | { type: 'SET_DIRECTION'; direction: 'RIGHT' | 'LEFT' }
  | { type: 'PLACE_BET'; quantity: number; face: DiceValue }
  | { type: 'DOUBT_BET' }
  | { type: 'SPOT_ON_BET' }
  | { type: 'SALPICON' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'REVEAL_NEXT_PLAYER' }
  | { type: 'FINISH_REVEAL' };

const initialState: GameState = {
  status: GameStatus.Setup,
  playDirection: 'RIGHT',
  players: [],
  totalDiceInPlay: 0,
  currentPlayerIndex: 0,
  roundStarterIndex: null,
  currentBet: null,
  previousBet: null,
  isBlindRound: false,
  roundResult: null,
  winner: null,
  message: '',
  revealState: null,
  revealOrder: null,
  revealType: null,
  revealedSalpiconPlayerId: null,
};

const getNextPlayerIndex = (currentIndex: number, players: Player[], direction: 'RIGHT' | 'LEFT'): number => {
    // Corrected logic: With opponents laid out counter-clockwise visually,
    // RIGHT (clockwise) means DECREASING the player index (e.g., from 0 to 5, 4, 3...).
    // LEFT (counter-clockwise) means INCREASING the player index (e.g., from 0 to 1, 2, 3...).
    const increment = direction === 'RIGHT' ? -1 : 1;
    let nextIndex = (currentIndex + increment + players.length) % players.length;
    while (players[nextIndex].isEliminated) {
        nextIndex = (nextIndex + increment + players.length) % players.length;
    }
    return nextIndex;
};

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'START_GAME': {
      const players: Player[] = Array.from({ length: action.playerCount }, (_, i) => ({
        id: i,
        name: i === 0 ? 'Tú' : `Oponente ${i}`,
        dice: rollDice(INITIAL_DICE_COUNT),
        diceCount: INITIAL_DICE_COUNT,
        isEliminated: false,
        hasBonusLife: false,
      }));
      const starterIndex = Math.floor(Math.random() * action.playerCount);
      const isHumanStarting = starterIndex === 0;
      
      const activePlayersCount = players.filter(p => !p.isEliminated).length;
      const requiresDirectionChoice = isHumanStarting && activePlayersCount > 2;
      const startingStatus = requiresDirectionChoice ? GameStatus.AwaitingDirection : GameStatus.InProgress;

      return {
        ...initialState,
        status: startingStatus,
        playDirection: 'RIGHT',
        players,
        totalDiceInPlay: action.playerCount * INITIAL_DICE_COUNT,
        currentPlayerIndex: starterIndex,
        roundStarterIndex: starterIndex,
        message: requiresDirectionChoice 
            ? `Comienzas la ronda. Elige la dirección del juego.`
            : `Comienza la ronda. Es el turno de ${players[starterIndex].name}.`,
      };
    }
    case 'SET_DIRECTION': {
        const starter = state.players[state.currentPlayerIndex];
        return {
            ...state,
            playDirection: action.direction,
            status: GameStatus.InProgress,
            // The player who chooses the direction makes the first bet.
            // DO NOT change currentPlayerIndex here.
            message: `${starter.name} eligió jugar por ${action.direction === 'RIGHT' ? 'la derecha' : 'la izquierda'}. Ahora debe apostar.`,
        };
    }
    case 'PLACE_BET': {
      const newBet: Bet = {
        playerId: state.players[state.currentPlayerIndex].id,
        quantity: action.quantity,
        face: action.face,
      };
      const nextPlayerIndex = getNextPlayerIndex(state.currentPlayerIndex, state.players, state.playDirection);
      return {
        ...state,
        currentBet: newBet,
        previousBet: null, 
        currentPlayerIndex: nextPlayerIndex,
        message: `Turno de ${state.players[nextPlayerIndex].name}.`
      };
    }
    case 'SALPICON': {
        const player = state.players[state.currentPlayerIndex];
        if (player.diceCount !== 5) return state;

        const nextPlayerIndex = getNextPlayerIndex(state.currentPlayerIndex, state.players, state.playDirection);
        return {
            ...state,
            previousBet: state.currentBet,
            currentBet: {
                playerId: player.id,
                isSalpicon: true,
                quantity: 0,
                face: 1,
            },
            currentPlayerIndex: nextPlayerIndex,
            message: `${player.name} cantó Salpicón! Turno de ${state.players[nextPlayerIndex].name}.`,
        };
    }
    case 'DOUBT_BET': {
        if (!state.currentBet) return state;

        if (state.currentBet.isSalpicon) {
            const actionTaker = state.players[state.currentPlayerIndex];
            const salpiconCaller = state.players.find(p => p.id === state.currentBet!.playerId);
            if (!salpiconCaller) return state;

            const hasSalpicon = new Set(salpiconCaller.dice).size === 5;
            const doubterIsCorrect = !hasSalpicon;
            const loserId = doubterIsCorrect ? salpiconCaller.id : actionTaker.id;
            
            const result: RoundResult = {
                type: RevealType.SalpiconDoubt,
                isSuccess: doubterIsCorrect,
                actionTakerId: actionTaker.id,
                betPlayerId: salpiconCaller.id,
                loserId: loserId,
                actualCount: hasSalpicon ? 5 : new Set(salpiconCaller.dice).size,
            };

            let newPlayers = [...state.players];
            let newTotalDice = state.totalDiceInPlay;
            const loser = newPlayers.find(p => p.id === loserId);

            if (loser?.hasBonusLife) {
                result.bonusLifeUsedBy = loserId;
                newPlayers = newPlayers.map(p => p.id === loserId ? { ...p, hasBonusLife: false } : p);
            } else {
                newTotalDice -= 1;
                newPlayers = newPlayers.map(p => {
                    if (p.id === loserId) {
                        const newDiceCount = p.diceCount - 1;
                        return { ...p, diceCount: newDiceCount, isEliminated: newDiceCount <= 0 };
                    }
                    return p;
                });
            }

            const activePlayers = newPlayers.filter(p => !p.isEliminated);
            const winner = activePlayers.length === 1 ? activePlayers[0] : null;

            return {
                ...state,
                status: winner ? GameStatus.GameOver : GameStatus.RoundOver,
                players: newPlayers,
                totalDiceInPlay: newTotalDice,
                winner,
                roundResult: result,
                currentBet: null,
                previousBet: null,
                revealedSalpiconPlayerId: salpiconCaller.id,
            };
        }

        const actionTakerIndex = state.currentPlayerIndex;
        const revealOrder = Array.from({ length: state.players.length }, (_, i) => 
            (actionTakerIndex + i) % state.players.length
        );

        return {
            ...state,
            status: GameStatus.Reveal,
            revealType: RevealType.Doubt,
            message: `Contando dados...`,
            revealOrder,
            revealState: {
                playerIndex: -1, 
                revealedCount: 0,
                message: `${state.players[actionTakerIndex].name} dudó la apuesta...`
            }
        };
    }
    case 'SPOT_ON_BET': {
        if (!state.currentBet || state.currentBet.isSalpicon) return state;

        const actionTakerIndex = state.currentPlayerIndex;
        const revealOrder = Array.from({ length: state.players.length }, (_, i) => 
            (actionTakerIndex + i) % state.players.length
        );

        return {
            ...state,
            status: GameStatus.Reveal,
            revealType: RevealType.SpotOn,
            message: `Contando dados...`,
            revealOrder,
            revealState: {
                playerIndex: -1, 
                revealedCount: 0,
                message: `${state.players[actionTakerIndex].name} cazó la apuesta...`
            }
        };
    }
    case 'REVEAL_NEXT_PLAYER': {
        if (!state.revealState || !state.currentBet || !state.revealOrder) return state;

        const nextRevealOrderIndex = state.revealState.playerIndex + 1;
        if (nextRevealOrderIndex >= state.players.length) return state;

        const playerIndexToReveal = state.revealOrder[nextRevealOrderIndex];
        const playerToReveal = state.players[playerIndexToReveal];
        if (!playerToReveal) return state;

        if (playerToReveal.isEliminated) {
            return {
                ...state,
                revealState: {
                    ...state.revealState,
                    playerIndex: nextRevealOrderIndex,
                    message: `${playerToReveal.name} está eliminado.`,
                },
            };
        }

        const betWasOnAces = state.currentBet.face === 1;
        const countInHand = countForFace(playerToReveal.dice, state.currentBet.face, betWasOnAces);
        const newTotalCount = state.revealState.revealedCount + countInHand;

        return {
            ...state,
            revealState: {
                ...state.revealState,
                playerIndex: nextRevealOrderIndex,
                revealedCount: newTotalCount,
                message: `Contando a ${playerToReveal.name}...`
            }
        };
    }
    case 'FINISH_REVEAL': {
        if (!state.currentBet || state.revealState === null || !state.revealType) return state;

        const actualCount = state.revealState.revealedCount;
        const actionTakerId = state.players[state.currentPlayerIndex].id;
        const betPlayerId = state.currentBet.playerId;
        
        let result: RoundResult;
        let newPlayers = [...state.players];
        let newTotalDice = state.totalDiceInPlay;

        if (state.revealType === RevealType.SpotOn) {
            const isSuccess = actualCount === state.currentBet.quantity;
            result = { type: RevealType.SpotOn, isSuccess, actionTakerId, betPlayerId, actualCount };
            if (isSuccess) {
                result.gainerId = actionTakerId;
                let gainedDie = false;
                newPlayers = newPlayers.map(p => {
                    if (p.id === actionTakerId) {
                        if (p.diceCount < INITIAL_DICE_COUNT) {
                            gainedDie = true;
                            return { ...p, diceCount: p.diceCount + 1 };
                        }
                        return { ...p, hasBonusLife: true };
                    }
                    return p;
                });
                if (gainedDie) newTotalDice += 1;
            } else {
                result.loserId = actionTakerId;
                const loser = newPlayers.find(p => p.id === actionTakerId);
                if (loser?.hasBonusLife) {
                    result.bonusLifeUsedBy = actionTakerId;
                    newPlayers = newPlayers.map(p => p.id === actionTakerId ? { ...p, hasBonusLife: false } : p);
                } else {
                    newTotalDice -= 1;
                    newPlayers = newPlayers.map(p => {
                        if (p.id === actionTakerId) {
                            const newDiceCount = p.diceCount - 1;
                            return { ...p, diceCount: newDiceCount, isEliminated: newDiceCount <= 0 };
                        }
                        return p;
                    });
                }
            }
        } else { // Doubt
            const isSuccess = actualCount < state.currentBet.quantity;
            const loserId = isSuccess ? betPlayerId : actionTakerId;
            result = { type: RevealType.Doubt, isSuccess, actionTakerId, betPlayerId, actualCount, loserId };
            const loser = newPlayers.find(p => p.id === loserId);
            if (loser?.hasBonusLife) {
                result.bonusLifeUsedBy = loserId;
                newPlayers = newPlayers.map(p => p.id === loserId ? { ...p, hasBonusLife: false } : p);
            } else {
                newTotalDice -= 1;
                newPlayers = newPlayers.map(p => {
                    if (p.id === loserId) {
                        const newDiceCount = p.diceCount - 1;
                        return { ...p, diceCount: newDiceCount, isEliminated: newDiceCount <= 0 };
                    }
                    return p;
                });
            }
        }
        
        const activePlayers = newPlayers.filter(p => !p.isEliminated);
        const winner = activePlayers.length === 1 ? activePlayers[0] : null;

        return {
            ...state,
            status: winner ? GameStatus.GameOver : GameStatus.RoundOver,
            players: newPlayers,
            totalDiceInPlay: newTotalDice,
            winner,
            revealState: null,
            roundResult: result
        };
    }
    case 'NEXT_ROUND': {
        const newPlayers = state.players.map(p => {
            if (p.isEliminated) return { ...p, dice: [] };
            return { ...p, dice: rollDice(p.diceCount) };
        });
        
        const activePlayers = newPlayers.filter(p => !p.isEliminated);
        const totalDiceInPlay = activePlayers.reduce((sum, p) => sum + p.diceCount, 0);

        let roundStarterIndex: number;
        
        const loserOfLastRound = state.players.find(p => p.id === state.roundResult?.loserId);
        // A player was eliminated this round if they were the loser and their dice count is now zero.
        const wasPlayerEliminated = !!(loserOfLastRound && loserOfLastRound.diceCount === 0 && loserOfLastRound.isEliminated);

        if (wasPlayerEliminated) {
            const newlyEliminatedPlayerId = loserOfLastRound!.id;
            const eliminatedPlayerIndex = state.players.findIndex(p => p.id === newlyEliminatedPlayerId);
            const minDiceCount = Math.min(...activePlayers.map(p => p.diceCount));
            const playersWithMinDice = activePlayers.filter(p => p.diceCount === minDiceCount);

            if (playersWithMinDice.length === 1) {
                roundStarterIndex = newPlayers.findIndex(p => p.id === playersWithMinDice[0].id);
            } else {
                // Tie-breaker: find the first player with min dice clockwise (right) from the eliminated player.
                let searchIndex = (eliminatedPlayerIndex - 1 + newPlayers.length) % newPlayers.length;
                while (true) {
                    const playerAtSearchIndex = newPlayers[searchIndex];
                    if (!playerAtSearchIndex.isEliminated && playersWithMinDice.some(p => p.id === playerAtSearchIndex.id)) {
                        roundStarterIndex = searchIndex;
                        break;
                    }
                    searchIndex = (searchIndex - 1 + newPlayers.length) % newPlayers.length; // Continue clockwise
                }
            }
        } else {
            // Default logic: loser (or other relevant player) starts
            let potentialStarterIndex = state.currentPlayerIndex;
            if (state.roundResult) {
                const relevantPlayerId = state.roundResult.loserId ?? state.roundResult.gainerId ?? state.roundResult.actionTakerId;
                const idx = newPlayers.findIndex(p => p.id === relevantPlayerId);
                if (idx !== -1) potentialStarterIndex = idx;
            }
            roundStarterIndex = potentialStarterIndex;
        }

        while (newPlayers[roundStarterIndex]?.isEliminated) {
            roundStarterIndex = (roundStarterIndex + 1) % newPlayers.length;
        }
        
        const starter = newPlayers[roundStarterIndex];
        // A blind round happens if the starter has 1 die, UNLESS a player was just eliminated. This rule now applies to 2-player games as well.
        const isBlindRound = starter.diceCount === 1 && !wasPlayerEliminated;
        
        const commonNextRoundState = {
            ...state,
            players: newPlayers,
            totalDiceInPlay,
            currentPlayerIndex: roundStarterIndex,
            roundStarterIndex,
            currentBet: null,
            previousBet: null,
            roundResult: null,
            revealOrder: null,
            revealType: null,
            isBlindRound,
            revealedSalpiconPlayerId: null,
        };
        
        // If only 2 players, no need to choose direction
        if (activePlayers.length <= 2) {
            return {
                ...commonNextRoundState,
                status: GameStatus.InProgress,
                playDirection: 'RIGHT',
                // Blind round logic is now controlled by the main `isBlindRound` variable
                message: `Comienza la ronda. Es el turno de ${starter.name}.`,
            };
        }
        
        // If human player starts
        if (starter.id === 0) {
            return {
                ...commonNextRoundState,
                status: GameStatus.AwaitingDirection,
                message: isBlindRound 
                    ? `Empiezas con un dado. ¡Ronda a ciegas! Elige la dirección.`
                    : `Comienzas la ronda. Elige la dirección del juego.`,
            };
        } else { // If a bot starts
            const newDirection = Math.random() < 0.5 ? 'RIGHT' : 'LEFT';
            let message = `Comienza una nueva ronda. ${starter.name} elige jugar por ${newDirection === 'RIGHT' ? 'la derecha' : 'la izquierda'}.`;
            if (isBlindRound) {
                message = `${starter.name} empieza con un dado. ¡Ronda a ciegas! Elige jugar por ${newDirection === 'RIGHT' ? 'la derecha' : 'la izquierda'}.`;
            }
            return {
                ...commonNextRoundState,
                status: GameStatus.InProgress,
                playDirection: newDirection,
                currentPlayerIndex: roundStarterIndex,
                message: `${message} Es su turno.`,
            };
        }
    }
    case 'SET_MESSAGE': {
        return { ...state, message: action.message };
    }
    default:
      return state;
  }
};

export const useCachoGame = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const { status, players, currentPlayerIndex, currentBet, previousBet, totalDiceInPlay, revealState, revealOrder, isBlindRound } = state;

  useEffect(() => {
    // This effect handles bot actions.
    if (status === GameStatus.InProgress && players.length > 0 && players[currentPlayerIndex]?.id !== 0) {
      const botPlayer = players[currentPlayerIndex];
      const thinkingTimeout = setTimeout(() => {
        dispatch({ type: 'SET_MESSAGE', message: `${botPlayer.name} está pensando...` });
        
        const actionTimeout = setTimeout(() => {
            const isBotBlind = !!isBlindRound && botPlayer.id !== state.roundStarterIndex && botPlayer.diceCount > 1;
            const botAction = decideBotAction(botPlayer, currentBet, previousBet, totalDiceInPlay, players.length, isBotBlind);
            if (botAction.type === 'doubt') {
                dispatch({ type: 'DOUBT_BET' });
            } else if (botAction.type === 'spot_on') {
                dispatch({ type: 'SPOT_ON_BET' });
            } else if (botAction.type === 'salpicon') {
                dispatch({ type: 'SALPICON' });
            } else {
                dispatch({ type: 'PLACE_BET', quantity: botAction.quantity, face: botAction.face });
            }
        }, 1000 + Math.random() * 1000);

        return () => clearTimeout(actionTimeout);
      }, 500);

      return () => clearTimeout(thinkingTimeout);
    }
  }, [status, currentPlayerIndex, players, currentBet, previousBet, totalDiceInPlay, isBlindRound, state.roundStarterIndex]);
  
  useEffect(() => {
    // This effect handles the dice reveal animation sequence.
    if (status !== GameStatus.Reveal) return;

    const currentRevealOrderIndex = revealState?.playerIndex ?? -1;

    if (currentRevealOrderIndex >= players.length - 1) {
        const finishTimer = setTimeout(() => dispatch({ type: 'FINISH_REVEAL' }), 1000);
        return () => clearTimeout(finishTimer);
    }

    const nextRevealOrderIndex = currentRevealOrderIndex + 1;
    const playerIndexToReveal = revealOrder![nextRevealOrderIndex];
    const playerToReveal = players[playerIndexToReveal];

    const delay = playerToReveal.isEliminated ? 100 : 1200;

    const revealTimer = setTimeout(() => {
        dispatch({ type: 'REVEAL_NEXT_PLAYER' });
    }, delay);

    return () => clearTimeout(revealTimer);
  }, [status, players, revealState, revealOrder]);


  useEffect(() => {
    // This effect automatically starts the next round after the results are shown.
    if (status === GameStatus.RoundOver) {
        const nextRoundTimer = setTimeout(() => {
            dispatch({ type: 'NEXT_ROUND' });
        }, 4000);

        return () => clearTimeout(nextRoundTimer);
    }
  }, [status]);


  const startGame = (playerCount: number) => dispatch({ type: 'START_GAME', playerCount });
  const setDirection = (direction: 'RIGHT' | 'LEFT') => dispatch({ type: 'SET_DIRECTION', direction });
  const placeBet = (quantity: number, face: DiceValue) => dispatch({ type: 'PLACE_BET', quantity, face });
  const doubtBet = () => dispatch({ type: 'DOUBT_BET' });
  const spotOnBet = () => dispatch({ type: 'SPOT_ON_BET' });
  const salpicon = () => dispatch({ type: 'SALPICON' });

  return { state, startGame, setDirection, placeBet, doubtBet, spotOnBet, salpicon };
};