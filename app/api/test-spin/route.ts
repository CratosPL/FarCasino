import { NextResponse } from "next/server"

// This is a test endpoint that returns a predefined spin result
export async function GET() {
  // Create a test result with some winning combinations
  const reels = [
    ["wild", "symbol1", "symbol2", "10", "J", "Q", "K"],
    ["wild", "symbol1", "symbol3", "10", "J", "Q", "K"],
    ["wild", "symbol1", "symbol4", "10", "J", "Q", "K"],
    ["A", "symbol2", "symbol3", "10", "J", "Q", "K"],
    ["A", "symbol2", "symbol4", "10", "J", "Q", "K"],
  ]

  const winningLines = [
    {
      lineIdx: 0,
      symbolId: "wild",
      count: 3,
      win: 4,
    },
    {
      lineIdx: 1,
      symbolId: "symbol1",
      count: 3,
      win: 1,
    },
  ]

  return NextResponse.json({
    reels,
    balance: 105,
    win: 5,
    spinCount: 1,
    winningLines,
    scatterPositions: [],
    wildExpandMultipliers: [],
    isFreeSpins: false,
    freeSpinsRemaining: 0,
    bonusWin: 0,
  })
}
