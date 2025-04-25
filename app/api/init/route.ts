import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

// Simple in-memory storage for player data
// In a production app, you would use a database
const players = new Map()

export async function POST(request: Request) {
  try {
    // Generate a unique player ID
    const playerId = uuidv4()

    // Initialize player data
    players.set(playerId, {
      playerId,
      balance: 100.0, // Starting balance
      spinCount: 0,
      maxSpins: 100,
      totalBet: 0,
      totalWin: 0,
      lastSpin: null,
    })

    return NextResponse.json({
      playerId,
      balance: 100.0,
      spinCount: 0,
      maxSpins: 100,
    })
  } catch (error) {
    console.error("Error initializing player:", error)
    return NextResponse.json({ error: "Failed to initialize player" }, { status: 500 })
  }
}
