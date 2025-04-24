// Adres serwera - zmień na adres swojego wdrożenia na Vercel
const serverUrl = "https://v0-new-project-gxflxaqqoul.vercel.app" // Zastąp faktycznym adresem z Vercel
let playerId = null
let balance = 0
let spinCount = 0
let maxSpins = 0
let balanceDisplay
let spinCountDisplay
let reels
let spinning = false
let isFreeSpins = false
const bet = 1
let wildExpandState = "none"
let spinButton
let playSound
let symbols
let lastWin
let winningLines
let scatterPositions
let freeSpinsRemaining
let bonusWin
let winDisplay
let spinOffsets = [0, 0, 0, 0, 0]
let scatterAnimationState = "none"
let scatterAnimationTime = 0
const scatterPulseDuration = 1000
let bonusScreen
let isShowingWin
let winAnimationTime
let paylines
let canvas
let particles
let gameState
let startScreen
let startMessage
let startButtonContainer
let controls
let logo
let initializeAudioContext
let loadAudioFiles
let playBackgroundMusic
let stopBackgroundMusic
let endFreeSpins
let wildExpandReelAnimations = new Map()
let expandedWildReels = new Set()

// Inicjalizacja gracza na serwerze
async function initPlayer() {
  try {
    const response = await fetch(`${serverUrl}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const data = await response.json()
    playerId = data.playerId
    balance = Number.parseFloat(data.balance)
    spinCount = data.spinCount
    maxSpins = data.maxSpins
    balanceDisplay.textContent = balance.toFixed(2)
    spinCountDisplay.textContent = `${spinCount}/${maxSpins}`
    console.log(`Gracz zainicjalizowany: ${playerId}`)
  } catch (e) {
    console.error("Błąd inicjalizacji gracza:", e)
  }
}

// Zastąp funkcję initializeReels - bębny będą generowane przez serwer
function initializeReels() {
  reels = [[], [], [], [], []] // Puste bębny, wypełniane przez serwer
  console.log("Bębny zainicjalizowane (puste, oczekują na dane z serwera)")
}

// Zastąp funkcję spinReels - teraz komunikuje się z serwerem
async function spinReels() {
  if (
    spinning ||
    (!isFreeSpins && balance < bet) ||
    wildExpandState !== "none" ||
    (!isFreeSpins && spinCount >= maxSpins)
  ) {
    console.log("Spin zablokowany:", { spinning, balance, bet, wildExpandState, spinCount, maxSpins })
    return
  }
  spinning = true
  spinButton.disabled = true
  spinButton.classList.remove("active")
  playSound("spin")

  try {
    const response = await fetch(`${serverUrl}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, bet }),
    })
    const data = await response.json()
    if (data.error) {
      console.error("Błąd spinu:", data.error)
      spinning = false
      spinButton.disabled = false
      return
    }

    // Aktualizacja stanu gry
    reels = data.reels.map((reel) => reel.map((id) => symbols.find((s) => s.id === id)))
    balance = Number.parseFloat(data.balance)
    lastWin = Number.parseFloat(data.win)
    spinCount = data.spinCount
    winningLines = data.winningLines
    scatterPositions = data.scatterPositions
    isFreeSpins = data.isFreeSpins
    freeSpinsRemaining = data.freeSpinsRemaining
    bonusWin = Number.parseFloat(data.bonusWin)

    balanceDisplay.textContent = balance.toFixed(2)
    winDisplay.textContent = lastWin.toFixed(2)
    spinCountDisplay.textContent = `${spinCount}/${maxSpins}`
    console.log(`Serwer RTP: ${data.currentRTP}%`)

    // Animacja spinu z requestAnimationFrame dla lepszej wydajności
    const startTime = Date.now()
    const SPIN_DURATION = 2000
    const SPIN_DELAY_PER_REEL = 200
    const SPIN_AMPLITUDE = 2

    function animate() {
      const currentTime = Date.now()
      const elapsedTime = currentTime - startTime

      // Animuj każdy bęben z opóźnieniem
      for (let i = 0; i < 5; i++) {
        const reelTime = elapsedTime - i * SPIN_DELAY_PER_REEL
        if (reelTime <= 0) continue

        const reelDuration = SPIN_DURATION + (i * SPIN_DELAY_PER_REEL) / 2
        const progress = Math.min(reelTime / reelDuration, 1)

        // Funkcja easeOutBack dla bardziej realistycznego efektu
        const easeOutBack = (x) => {
          const c1 = 1.70158
          const c3 = c1 + 1
          return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
        }

        // Zastosuj funkcję ease do postępu
        const easedProgress = progress >= 1 ? 1 : easeOutBack(progress)

        // Oblicz offset z efektem sprężystości na końcu
        if (progress < 0.7) {
          // Faza szybkiego obrotu
          spinOffsets[i] = SPIN_AMPLITUDE * Math.sin(progress * Math.PI * 10)
        } else if (progress < 1) {
          // Faza zwalniania
          const slowingProgress = (progress - 0.7) / 0.3
          spinOffsets[i] = SPIN_AMPLITUDE * Math.sin(slowingProgress * Math.PI) * (1 - slowingProgress)
        } else {
          // Zatrzymanie
          spinOffsets[i] = 0
          if (i === 4 && progress === 1) {
            playSound("reelStop")
          }
        }
      }

      // Kontynuuj animację lub zakończ
      if (elapsedTime < SPIN_DURATION + 4 * SPIN_DELAY_PER_REEL + 500) {
        requestAnimationFrame(animate)
      } else {
        // Zakończ animację
        spinning = false
        spinOffsets = [0, 0, 0, 0, 0]

        // Obsługa scatterów i darmowych spinów
        if (scatterPositions.length >= 3 && !isFreeSpins) {
          scatterAnimationState = "pulsating"
          scatterAnimationTime = scatterPulseDuration
          playSound("bonus")
          setTimeout(() => {
            scatterAnimationState = "none"
            scatterPositions = []
            bonusScreen.style.display = "block"
            setTimeout(() => {
              bonusScreen.style.display = "none"
              if (isFreeSpins && freeSpinsRemaining > 0) setTimeout(spinReels, 1000)
            }, 3000)
          }, scatterPulseDuration)
        } else {
          checkForWildExpand(data.wildExpandMultipliers)
        }

        spinButton.disabled = isFreeSpins
        if (!isFreeSpins) spinButton.classList.add("active")
        if (window.FarcadeSDK && window.FarcadeSDK.singlePlayer) {
          window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
        }

        if (!isFreeSpins && (spinCount >= maxSpins || balance <= 0)) {
          saveAndEndGame()
        }
      }
    }

    // Rozpocznij animację
    requestAnimationFrame(animate)
  } catch (e) {
    console.error("Błąd spinu:", e)
    spinning = false
    spinButton.disabled = false
  }
}

// Zaktualizowana funkcja checkForWildExpand - teraz obsługuje mnożniki z serwera
function checkForWildExpand(wildExpandMultipliers = []) {
  expandedWildReels = new Set()
  wildExpandReelAnimations = new Map()

  if (wildExpandMultipliers.length > 0) {
    wildExpandState = "expanding"

    wildExpandMultipliers.forEach(({ reel, row, multiplier }) => {
      expandedWildReels.add(reel)
      wildExpandReelAnimations.set(reel, {
        highlightProgress: 0,
        expandProgress: 0,
        row,
        multiplier,
      })

      // Zamień wszystkie symbole na wild w tym bębnie
      for (let j = 0; j < 5; j++) {
        reels[reel][j] = symbols.find((s) => s.id === "wild")
      }
    })

    playSound("wildExpand")

    // Animacja rozszerzania
    let expandTime = 0
    const expandInterval = setInterval(() => {
      expandTime += 16

      // Aktualizuj postęp animacji
      wildExpandReelAnimations.forEach((animation, reelIndex) => {
        animation.highlightProgress = Math.min(expandTime / 500, 1)
        if (expandTime > 500) {
          animation.expandProgress = Math.min((expandTime - 500) / 500, 1)
        }
      })

      if (expandTime > 1000) {
        clearInterval(expandInterval)
        wildExpandState = "expanded"

        // Sprawdź wygrane po rozszerzeniu
        checkWins()

        // Po zakończeniu animacji wygranych
        setTimeout(() => {
          wildExpandState = "none"
          expandedWildReels.clear()
          wildExpandReelAnimations.clear()

          if (isFreeSpins && freeSpinsRemaining > 0) {
            setTimeout(spinReels, 2000)
          }
        }, 3000)
      }
    }, 16)
  } else {
    // Brak wild expand, sprawdź normalne wygrane
    checkWins()
  }
}

// Zastąp funkcję checkWins - teraz wyniki są dostarczane przez serwer
function checkWins() {
  if (scatterAnimationState === "pulsating") return
  if (lastWin > 0) {
    isShowingWin = true
    winAnimationTime = 2000
    if (lastWin >= 50) playSound("bigWin", 0.5)
    else playSound("win")
    if (window.FarcadeSDK && window.FarcadeSDK.singlePlayer) {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
    }
    // Define Particle class
    class Particle {
      constructor(x, y) {
        this.x = x
        this.y = y
        this.size = Math.random() * 5 + 1
        this.speedX = Math.random() * 3 - 1.5
        this.speedY = Math.random() * 3 - 1.5
      }
      update() {
        this.x += this.speedX
        this.y += this.speedY
        if (this.size > 0.1) this.size -= 0.05
      }
    }
    for (const win of winningLines) {
      const line = paylines[win.lineIdx]
      for (let i = 0; i < win.count; i++) {
        const gridSize = 400
        const gridX = (canvas.width - gridSize) / 2
        const gridY = (canvas.height - gridSize) / 2 + 50
        const symbolWidth = gridSize / 5
        const symbolHeight = gridSize / 5
        const centerX = gridX + i * symbolWidth + symbolWidth / 2
        const centerY = gridY + line[i] * symbolHeight + symbolHeight / 2
        for (let p = 0; p < 5; p++) {
          particles.push(new Particle(centerX, centerY))
        }
      }
    }
  } else {
    playSound("noWin")
    isShowingWin = false
  }
  if (isFreeSpins && freeSpinsRemaining > 0 && wildExpandState === "none") {
    setTimeout(spinReels, 2000)
  } else if (isFreeSpins && freeSpinsRemaining === 0) {
    endFreeSpins()
  }
}

// Zmodyfikuj funkcję startGame, aby inicjalizować gracza na serwerze
async function startGame() {
  console.log("Starting game...")
  await initPlayer() // Inicjalizacja gracza na serwerze
  if (!initializeAudioContext()) {
    console.error("AudioContext initialization failed, continuing without audio")
  }
  try {
    await loadAudioFiles()
    playBackgroundMusic("backgroundMusic")
    playSound("startGame")
  } catch (e) {
    console.error("Failed to load audio files:", e)
  }
  gameState = "playing"
  startScreen.style.display = "none"
  startMessage.style.display = "none"
  startButtonContainer.style.display = "none"
  controls.style.display = "flex"
  logo.style.display = "block"
  initializeReels()
  spinButton.classList.add("active")
  playSound("startGame")
  if (window.FarcadeSDK?.singlePlayer) {
    window.FarcadeSDK.singlePlayer.actions.ready()
    window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
  }
}

// Zmodyfikuj funkcję saveAndEndGame, aby wysyłać statystyki na serwer
async function saveAndEndGame() {
  console.log("Saving score and ending game...")
  gameState = "ended"
  controls.style.display = "none"
  logo.style.display = "none"
  canvas.style.display = "none"
  stopBackgroundMusic()

  // Pobierz końcowe statystyki z serwera
  try {
    const response = await fetch(`${serverUrl}/stats/${playerId}`)
    const stats = await response.json()
    console.log("Końcowe statystyki:", stats)
  } catch (e) {
    console.error("Błąd pobierania statystyk:", e)
  }

  if (window.FarcadeSDK && window.FarcadeSDK.singlePlayer) {
    window.FarcadeSDK.singlePlayer.actions.gameOver({ score: balance })
    window.FarcadeSDK.singlePlayer.actions.hapticFeedback()
  }
}
