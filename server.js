const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const compression = require("compression");
const app = express();
const port = process.env.PORT || 3000;

// Lista dozwolonych domen
const allowedOrigins = ["https://app.farcade.ai", "https://play.farcade.ai"];

// Konfiguracja CORS z dynamicznym sprawdzaniem originów
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(compression()); // Włącz kompresję gzip/deflate
app.use(express.json());

// Symbol definitions
const symbols = [
  { id: "symbol1", value: 1, weight: 15 },
  { id: "symbol2", value: 1, weight: 15 },
  { id: "symbol3", value: 1, weight: 18 },
  { id: "symbol4", value: 1, weight: 18 },
  { id: "scatter", value: 0, weight: 3 },
  { id: "wild", value: 1, weight: 8 },
  { id: "hooligan", value: 1, weight: 10 },
  { id: "10", value: 1, weight: 10 },
  { id: "J", value: 1, weight: 10 },
  { id: "Q", value: 1, weight: 10 },
  { id: "K", value: 1, weight: 10 },
  { id: "A", value: 1, weight: 10 },
  { id: "wildexpand1", value: 0, weight: 1 },
];

// Prekompiluj wagi symboli dla szybszego losowania
const symbolWeights = [];
let totalWeight = 0;

function initSymbolWeights() {
  totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
  let accumulatedWeight = 0;
  symbols.forEach((symbol) => {
    accumulatedWeight += symbol.weight;
    symbolWeights.push({
      symbol,
      threshold: accumulatedWeight,
    });
  });
}

initSymbolWeights();

// Payline definitions
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
];

// In-memory database
const players = {};
let globalTurnover = 0;
let globalWins = 0;

// Buforowanie często używanych wyników
const resultsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

// Mechanizm czyszczenia nieaktywnych graczy
function cleanupInactivePlayers() {
  const now = Date.now();
  const inactiveThreshold = 30 * 60 * 1000; // 30 minut
  Object.keys(players).forEach((playerId) => {
    if (players[playerId].lastActivity && now - players[playerId].lastActivity > inactiveThreshold) {
      delete players[playerId];
    }
  });
}

// Uruchom czyszczenie co 10 minut
setInterval(cleanupInactivePlayers, 10 * 60 * 1000);

// Zoptymalizowana funkcja getRandomSymbol
function getRandomSymbol(scatterCount) {
  const rand = crypto.randomInt(0, totalWeight);
  let low = 0;
  const high = symbolWeights.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (rand < symbolWeights[mid].threshold) {
      const symbol = symbolWeights[mid].symbol;
      if (symbol.id === "scatter" && scatterCount >= 3) {
        return symbols.find((s) => s.id !== "scatter");
      }
      return symbol;
    }
    low = mid + 1;
  }
  return symbols[0];
}

// Funkcja do generowania mnożników dla Wild Expand
function generateWildExpandMultiplier() {
  return Math.random() < 0.7 ? 4 : 10;
}

// Player initialization
app.post("/init", (req, res) => {
  const playerId = req.body.playerId || `player_${Date.now()}`;
  players[playerId] = {
    balance: 200,
    totalTurnover: 0,
    totalWins: 0,
    spinCount: 0,
    maxSpins: 100,
    isFreeSpins: false,
    freeSpinsRemaining: 0,
    bonusWin: 0,
    bonusBet: 0,
    lastActivity: Date.now(),
  };
  res.json({ playerId, ...players[playerId] });
});

// Spin execution
app.post("/spin", (req, res) => {
  const { playerId, bet } = req.body;
  const player = players[playerId];
  if (!player || (player.balance < bet && !player.isFreeSpins) || player.spinCount >= player.maxSpins) {
    return res.status(400).json({ error: "Invalid spin" });
  }

  player.lastActivity = Date.now();

  let currentBet = bet;
  if (!player.isFreeSpins) {
    player.balance -= bet;
    player.totalTurnover += bet;
    globalTurnover += bet;
    player.spinCount++;
  } else {
    currentBet = player.bonusBet;
  }

  const reels = Array(5)
    .fill()
    .map(() => Array(7).fill(null));
  let scatterCount = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 7; j++) {
      reels[i][j] = getRandomSymbol(scatterCount);
      if (reels[i][j].id === "scatter") scatterCount++;
    }
  }

  let totalWin = 0;
  const winningLines = [];
  const scatterPositions = [];
  const wildExpandMultipliers = [];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (reels[i][j].id === "scatter") {
        scatterPositions.push([i, j]);
      }
      if (reels[i][j].id === "wildexpand1") {
        wildExpandMultipliers.push({
          reel: i,
          row: j,
          multiplier: generateWildExpandMultiplier(),
        });
      }
    }
  }

  if (scatterCount >= 3 && !player.isFreeSpins) {
    totalWin += currentBet * 2;
    player.isFreeSpins = true;
    player.freeSpinsRemaining = 10;
    player.bonusBet = currentBet;
  }

  for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
    const line = paylines[lineIdx];
    const symbolsInLine = line.map((row, i) => reels[i][row]);
    let firstSymbol = symbolsInLine[0];
    if (firstSymbol.id === "wild") {
      firstSymbol = symbolsInLine.find((s) => s.id !== "wild" && s.id !== "scatter") || firstSymbol;
    }
    if (firstSymbol.id === "scatter") continue;

    let count = 0;
    for (const symbol of symbolsInLine) {
      if (symbol.id === firstSymbol.id || symbol.id === "wild") count++;
      else break;
    }

    if (count >= 3) {
      let multiplier;
      if (["10", "J", "Q", "K", "A"].includes(firstSymbol.id)) {
        multiplier = count === 3 ? 0.1 : count === 4 ? 0.5 : 1;
      } else if (["symbol1", "symbol2"].includes(firstSymbol.id)) {
        multiplier = count === 3 ? 0.5 : count === 4 ? 2.5 : 5;
      } else if (["symbol3", "symbol4"].includes(firstSymbol.id)) {
        multiplier = count === 3 ? 1 : count === 4 ? 5 : 10;
      } else if (firstSymbol.id === "hooligan") {
        multiplier = count === 3 ? 2 : count === 4 ? 10 : 20;
      } else if (firstSymbol.id === "wild") {
        multiplier = count === 3 ? 4 : count === 4 ? 15 : 30;
      }
      const lineWin = firstSymbol.value * currentBet * multiplier;
      totalWin += lineWin;
      winningLines.push({ lineIdx, count, symbolId: firstSymbol.id, win: lineWin });
    }
  }

  totalWin = Number(totalWin.toFixed(2));
  player.balance += totalWin;
  if (player.isFreeSpins) player.bonusWin += totalWin;
  else {
    player.totalWins += totalWin;
    globalWins += totalWin;
  }

  if (player.isFreeSpins) {
    player.freeSpinsRemaining--;
    if (player.freeSpinsRemaining === 0) {
      player.isFreeSpins = false;
    }
  }

  // RTP adjustment
  const currentRTP = globalTurnover > 0 ? (globalWins / globalTurnover) * 100 : 0;
  if (currentRTP < 94 && globalTurnover > 1000) {
    symbols.find((s) => s.id === "wild").weight *= 1.1;
  } else if (currentRTP > 98 && globalTurnover > 1000) {
    symbols.find((s) => s.id === "wild").weight /= 1.1;
  }

  res.json({
    reels: reels.map((reel) => reel.map((s) => s.id)),
    balance: player.balance.toFixed(2),
    win: totalWin.toFixed(2),
    spinCount: player.spinCount,
    winningLines,
    scatterPositions,
    wildExpandMultipliers,
    isFreeSpins: player.isFreeSpins,
    freeSpinsRemaining: player.freeSpinsRemaining,
    bonusWin: player.bonusWin.toFixed(2),
    currentRTP: currentRTP.toFixed(2),
  });
});

// Statistics
app.get("/stats/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  const cacheKey = `stats_${playerId}`;

  if (resultsCache.has(cacheKey)) {
    const cachedResult = resultsCache.get(cacheKey);
    if (Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return res.json(cachedResult.data);
    }
  }

  const player = players[playerId];
  if (!player) return res.status(404).json({ error: "Player not found" });

  const result = {
    balance: player.balance.toFixed(2),
    totalTurnover: player.totalTurnover.toFixed(2),
    totalWins: player.totalWins.toFixed(2),
    currentRTP: player.totalTurnover > 0 ? ((player.totalWins / player.totalTurnover) * 100).toFixed(2) : 0,
  };

  resultsCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result,
  });

  res.json(result);
});

// Dodaj endpoint testowy, który zwraca przykładowe dane w oczekiwanym formacie
app.get("/test-spin", (req, res) => {
  const testResponse = {
    reels: [
      ["symbol1", "wild", "scatter", "10", "J", "Q", "K"],
      ["symbol2", "wildexpand1", "hooligan", "A", "symbol3", "symbol4", "10"],
      ["symbol3", "symbol4", "10", "J", "Q", "K", "A"],
      ["symbol4", "10", "J", "Q", "K", "A", "symbol1"],
      ["10", "J", "Q", "K", "A", "symbol1", "symbol2"],
    ],
    balance: 99.8,
    win: 2.0,
    spinCount: 1,
    winningLines: [{ lineIdx: 0, count: 3, symbolId: "hooligan", win: 2 }],
    scatterPositions: [
      [0, 2],
      [2, 1],
      [4, 0],
    ],
    wildExpandMultipliers: [{ reel: 1, row: 1, multiplier: 4 }],
    isFreeSpins: false,
    freeSpinsRemaining: 0,
    bonusWin: 0,
    currentRTP: 67.78,
  };
  res.json(testResponse);
});

// Dodaj endpoint do debugowania, który zwraca wszystkie symbole
app.get("/symbols", (req, res) => {
  res.json(symbols);
});

// Dodaj endpoint do debugowania, który zwraca wszystkie linie wygranych
app.get("/paylines", (req, res) => {
  res.json(paylines);
});

app.get("/version", (req, res) => {
  res.json({ version: "1.2.0", name: "FarCasino" });
});

module.exports = app;
