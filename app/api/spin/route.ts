import { NextResponse } from "next/server"

// Simple in-memory storage for player data
// In a production app, you would use a database
const players = new Map()

// Symbol definitions
const symbols = [
  { id: "symbol1", weight: 15 },
  { id: "symbol2", weight: 15 },
  { id: "symbol3", weight: 18 },
  { id: "symbol4", weight: 18 },
  { id: "scatter", weight: 3 },
  { id: "wild", weight: 8 },
  { id: "hooligan", weight: 10 },
  { id: "10", weight: 10 },
  { id: "J", weight: 10 },
  { id: "Q", weight: 10 },
  { id: "K", weight: 10 },
  { id: "A", weight: 10 },
  { id: "wildexpand1", weight: 1 },
]

// Paylines configuration
const paylines = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [4, 4, 4, 4, 4],
  [0, 1, 2, 1, 0],
  [4, 3, 2, 3, 4],
  [0, 0, 1, 2, 2],
  [4, 4, 3, 2, 2],
  [2, 1, 0, 1, 2],
  [2, 3, 4, 3, 2],
  [1, 0, 1, 2, 3],
  [3, 4, 3, 2, 1],
  [0, 1, 1, 1, 0],
  [4, 3, 3, 3, 4],
]

// Paytable
const paytable = {
  hooligan: { 3: 2, 4: 10, 5: 20 },
  symbol1: { 3: 1, 4: 5, 5: 10 }, // Lantern with Stickers
  symbol2: { 3: 1, 4: 5, 5: 10 }, // Ultra Beer
  symbol3: { 3: 0.5, 4: 2.5, 5: 5 }, // Clenched Fist
  symbol4: { 3: 0.5, 4: 2.5, 5: 5 }, // Knuckles and Shoe
  A: { 3: 0.1, 4: 0.5, 5: 1 },
  K: { 3: 0.1, 4: 0.5, 5: 1 },
  Q: { 3: 0.1, 4: 0.5, 5: 1 },
  J: { 3: 0.1, 4: 0.5, 5: 1 },
  "10": { 3: 0.1, 4: 0.5, 5: 1 },
  wild: { 3: 4, 4: 15, 5: 30 },
}

// Helper function to get a random symbol based on weights
function getRandomSymbol() {
  const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0)
  const rand = Math.random() * totalWeight
  let accumulatedWeight = 0

  for (const symbol of symbols) {
    accumulatedWeight += symbol.weight
    if (rand < accumulatedWeight) {
      return symbol.id
    }
  }

  return symbols[0].id
}

// Generate a random reel
function generateReel() {
  return Array(7)
    .fill(null)
    .map(() => getRandomSymbol())
}

// Check for winning combinations
function checkWins(reels, bet, isFreeSpin) {
  const visibleReels = reels.map((reel) => reel.slice(0, 5))
  const winningLines = []
  let totalWin = 0

  // Check each payline
  paylines.forEach((line, lineIdx) => {
    const symbolsOnLine = line.map((row, col) => visibleReels[col][row])

    // Check for wild symbols
    const firstSymbol =
      symbolsOnLine[0] === "wild" ? symbolsOnLine.find((s) => s !== "wild") || "wild" : symbolsOnLine[0]

    if (firstSymbol === "scatter") return // Scatter wins are handled separately

    // Count consecutive matching symbols
    let count = 1
    for (let i = 1; i < symbolsOnLine.length; i++) {
      if (symbolsOnLine[i] === firstSymbol || symbolsOnLine[i] === "wild") {
        count++
      } else {
        break
      }
    }

    // Check if win
    if (count >= 3 && paytable[firstSymbol] && paytable[firstSymbol][count]) {
      const multiplier = paytable[firstSymbol][count]
      const win = bet * multiplier
      totalWin += win

      winningLines.push({
        lineIdx,
        symbolId: firstSymbol,
        count,
        win,
      })
    }
  })

  // Check for scatters
  const scatterPositions = []
  visibleReels.forEach((reel, reelIdx) => {
    reel.forEach((symbol, rowIdx) => {
      if (symbol === "scatter") {
        scatterPositions.push([reelIdx, rowIdx])
      }
    })
  })

  // 3 or more scatters trigger free spins
  if (scatterPositions.length >= 3 && !isFreeSpin) {
    totalWin += bet * 2 // Scatter pays 2x bet
  }

  return {
    winningLines,
    totalWin,
    scatterPositions,
  }
}

// Check for wild expand symbols
function checkWildExpand(reels) {
  const wildExpandMultipliers = []

  reels.forEach((reel, reelIdx) => {
    reel.forEach((symbol, rowIdx) => {
      if (symbol === "wildexpand1" && rowIdx < 5) {
        // 50% chance for 4x, 50% chance for 10x multiplier
        const multiplier = Math.random() < 0.5 ? 4 : 10
        wildExpandMultipliers.push({
          reel: reelIdx,
          row: rowIdx,
          multiplier,
        })
      }
    })
  })

  return wildExpandMultipliers
}

export async function POST(request: Request) {
  try {
    const { playerId, bet, isFreeSpin } = await request.json()

    // Validate player exists
    if (!players.has(playerId)) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    const player = players.get(playerId)

    // Validate bet
    if (!isFreeSpin && player.balance < bet) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Generate reels
    const reels = Array(5)
      .fill(null)
      .map(() => generateReel())

    // Check for wins
    const { winningLines, totalWin, scatterPositions } = checkWins(reels, bet, isFreeSpin)

    // Check for wild expand
    const wildExpandMultipliers = checkWildExpand(reels)

    // Update player data
    if (!isFreeSpin) {
      player.balance -= bet
      player.totalBet += bet
      player.spinCount += 1
    }

    player.balance += totalWin
    player.totalWin += totalWin

    // Handle free spins
    let isFreeSpins = isFreeSpin
    let freeSpinsRemaining = 0
    let bonusWin = 0

    if (scatterPositions.length >= 3 && !isFreeSpin) {
      isFreeSpins = true
      freeSpinsRemaining = 10
    } else if (isFreeSpin) {
      freeSpinsRemaining = player.freeSpinsRemaining - 1
      bonusWin = player.bonusWin + totalWin

      if (freeSpinsRemaining <= 0) {
        isFreeSpins = false
      }
    }

    // Update free spins data
    player.isFreeSpins = isFreeSpins
    player.freeSpinsRemaining = freeSpinsRemaining
    player.bonusWin = bonusWin

    // Save last spin data
    player.lastSpin = {
      reels,
      winningLines,
      totalWin,
      scatterPositions,
      wildExpandMultipliers,
    }

    return NextResponse.json({
      reels: reels.map((reel) => reel.map((symbol) => symbol)),
      balance: player.balance,
      win: totalWin,
      spinCount: player.spinCount,
      winningLines,
      scatterPositions,
      wildExpandMultipliers,
      isFreeSpins,
      freeSpinsRemaining,
      bonusWin,
    })
  } catch (error) {
    console.error("Error processing spin:", error)
    return NextResponse.json({ error: "Failed to process spin" }, { status: 500 })
  }
}
