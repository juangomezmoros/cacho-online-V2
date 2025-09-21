import type { DiceValue, Bet, Player } from '../types';

/**
 * Rolls a specified number of dice.
 * @param count - The number of dice to roll.
 * @returns An array of DiceValue.
 */
export const rollDice = (count: number): DiceValue[] => {
  return Array.from({ length: count }, () => (Math.floor(Math.random() * 6) + 1) as DiceValue);
};

/**
 * Counts the occurrences of a specific face value in a set of dice.
 * Aces (1s) are wild when the bet is on a non-ace face.
 * @param dice - The array of dice to count from.
 * @param face - The face value to count.
 * @param isBetOnAces - Whether the bet is on aces. If true, aces are not wild.
 * @returns The total count for the given face.
 */
export const countForFace = (dice: DiceValue[], face: DiceValue, isBetOnAces: boolean): number => {
  if (isBetOnAces) {
    // If betting on aces, only count aces.
    return dice.filter(d => d === 1).length;
  }
  // If betting on another face, count that face AND aces (wild).
  return dice.filter(d => d === face || d === 1).length;
};


/**
 * Checks if a new bet is valid compared to the current bet, following Cacho rules.
 * @param betToBeat - The current bet on the table to be beaten.
 * @param next - The new bet being placed.
 * @returns An object indicating if the bet is valid and a reason if not.
 */
export const isBetValid = (betToBeat: Bet | null, next: Bet): { ok: boolean; reason?: string } => {
  if (!betToBeat) {
    return next.quantity >= 1 ? { ok: true } : { ok: false, reason: "La primera apuesta debe ser de al menos 1." };
  }

  const prevIsAces = betToBeat.face === 1;
  const nextIsAces = next.face === 1;

  // Case 1: Same family (non-aces to non-aces)
  if (!prevIsAces && !nextIsAces) {
    if (next.quantity > betToBeat.quantity) return { ok: true };
    if (next.quantity === betToBeat.quantity && next.face > betToBeat.face) return { ok: true };
    return { ok: false, reason: "Debe subir cantidad o cara." };
  }

  // Case 2: Same family (aces to aces)
  if (prevIsAces && nextIsAces) {
    if (next.quantity > betToBeat.quantity) return { ok: true };
    return { ok: false, reason: "En ases, debe subir la cantidad." };
  }

  // Case 3: Transition from non-aces to aces
  if (!prevIsAces && nextIsAces) {
    const requiredQty = Math.floor(betToBeat.quantity / 2) + 1;
    if (next.quantity >= requiredQty) return { ok: true };
    return { ok: false, reason: `Para cambiar a ases, necesita al menos ${requiredQty}.` };
  }

  // Case 4: Transition from aces to non-aces
  if (prevIsAces && !nextIsAces) {
    const requiredQty = betToBeat.quantity * 2 + 1;
    if (next.quantity >= requiredQty) return { ok: true };
    return { ok: false, reason: `Para salir de ases, necesita al menos ${requiredQty}.` };
  }

  return { ok: false, reason: "Apuesta inválida." }; // Should not be reached
};

/**
 * Calculates the minimum valid quantity for a given face, based on the previous bet.
 */
const getMinValidQuantity = (prev: Bet, face: DiceValue): number => {
    const prevIsAces = prev.face === 1;
    const nextIsAces = face === 1;

    if (!prevIsAces && !nextIsAces) { // non-ace to non-ace
        return face > prev.face ? prev.quantity : prev.quantity + 1;
    }
    if (prevIsAces && nextIsAces) { // ace to ace
        return prev.quantity + 1;
    }
    if (!prevIsAces && nextIsAces) { // non-ace to ace
        return Math.floor(prev.quantity / 2) + 1;
    }
    if (prevIsAces && !nextIsAces) { // ace to non-ace
        return prev.quantity * 2 + 1;
    }
    return 1; // Should not happen with a previous bet
};

/**
 * Advanced AI logic for bot players to decide their action based on statistics and strategy.
 */
export const decideBotAction = (
  bot: Player,
  currentBet: Bet | null,
  previousBet: Bet | null,
  totalDiceInPlay: number,
  playerCount: number,
  isBlind: boolean,
): { type: 'bet'; quantity: number; face: DiceValue } | { type: 'doubt' } | { type: 'spot_on' } | { type: 'salpicon' } => {
  
  const betToBeat = currentBet?.isSalpicon ? previousBet : currentBet;

  // Handle reacting to a Salpicon call
  if (currentBet?.isSalpicon) {
      if (Math.random() < 0.65) {
        return { type: 'doubt' };
      }
  }
  
  if (!betToBeat) {
    // Smarter starting bet logic
    if (bot.diceCount === 5 && !isBlind && new Set(bot.dice).size >= 4 && Math.random() < 0.25) {
        return { type: 'salpicon' };
    }
    // Find the face the bot has the most of, with a tie-breaker for higher value faces.
    const counts = new Map<DiceValue, number>();
    for (const val of [1,2,3,4,5,6] as DiceValue[]) {
      counts.set(val, isBlind ? 0 : countForFace(bot.dice, val, val === 1));
    }
    const sortedFaces = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count desc
        return b[0] - a[0]; // Then by face value desc
    });
    const bestFace = isBlind ? ( (Math.floor(Math.random() * 6) + 1) as DiceValue ) : sortedFaces[0][0];

    // Calculate the total expected number of that face across all dice
    let totalExpected: number;
    const probability = bestFace === 1 ? (1/6) : (1/3); // Aces are 1/6, others are 1/3 (face + wild ace)
    if (isBlind) {
        totalExpected = totalDiceInPlay * probability;
    } else {
        const myCount = countForFace(bot.dice, bestFace, bestFace === 1);
        const otherDiceCount = totalDiceInPlay - bot.diceCount;
        const expectedFromOthers = otherDiceCount * probability;
        totalExpected = myCount + expectedFromOthers;
    }

    // Base the bid on the calculated expectation, with some variability.
    let bidQuantity = Math.floor(totalExpected);
    const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    bidQuantity += variation;
    
    const finalQuantity = Math.max(1, bidQuantity);

    return { type: 'bet', quantity: finalQuantity, face: bestFace };
  }
  
  // Consider calling Salpicon if the bot has 5 dice and is not blind
  if (bot.diceCount === 5 && !isBlind && Math.random() < 0.15) { 
      return { type: 'salpicon' };
  }

  const pBluff = 0.15; // 15% chance to bluff
  
  // Calculate scores (expected counts) for each face
  const scores = new Map<DiceValue, number>();
  for (const face of [1,2,3,4,5,6] as DiceValue[]) {
      const isBetOnAces = face === 1;
      let expectedCount: number;

      if (isBlind) {
          // Pure statistical guess based on all dice in play
          expectedCount = isBetOnAces ? (totalDiceInPlay / 6) : (totalDiceInPlay / 3);
      } else {
          // Guess based on known dice + statistics for others
          const myKnownCount = countForFace(bot.dice, face, isBetOnAces);
          const otherDiceCount = totalDiceInPlay - bot.dice.length;
          const expectedFromOthers = isBetOnAces ? (otherDiceCount / 6) : (otherDiceCount / 3);
          expectedCount = myKnownCount + expectedFromOthers;
      }
      scores.set(face, expectedCount);
  }

  // Check for Spot On (Cazar) opportunity
  const currentBetScore = scores.get(betToBeat.face)!;
  if (!isBlind && Math.abs(betToBeat.quantity - currentBetScore) < 0.4 && Math.random() < 0.5) {
      return { type: 'spot_on' };
  }

  // Evaluate options
  const possiblePlays: Array<{face: DiceValue, quantity: number, score: number, credibility: number}> = [];
  
  for (const face of [1,2,3,4,5,6] as DiceValue[]) {
      const minValidQty = getMinValidQuantity(betToBeat, face);
      const score = scores.get(face)!;
      possiblePlays.push({
          face,
          quantity: minValidQty,
          score,
          credibility: score - minValidQty // How much does our score exceed the minimum bet?
      });
  }

  // Sort by best credibility
  possiblePlays.sort((a,b) => b.credibility - a.credibility);

  const bestPlay = possiblePlays[0];

  // Decision to doubt: if the current bet is much higher than our best estimate, or if our best play is still "bad"
  const doubtThreshold = isBlind ? -0.5 : -1.0;
  if (betToBeat.quantity > Math.ceil(currentBetScore) + 1 || bestPlay.credibility < doubtThreshold) {
      if (Math.random() > 0.15) {
          return { type: 'doubt' };
      }
  }

  let targetQuantity = Math.max(bestPlay.quantity, Math.floor(bestPlay.score));
  
  if (Math.random() < pBluff) {
    targetQuantity += 1;
  }
  
  return { type: 'bet', quantity: targetQuantity, face: bestPlay.face };
};