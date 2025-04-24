# FarCasino

Serwer gry kasynowej dla platformy Farcade.

## Setup Instructions

### Local Development

1. Clone this repository:
   \`\`\`
   git clone <repository-url>
   cd farcasino-server
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

   The server will run on http://localhost:3000

### Production Deployment (Vercel)

1. Install Vercel CLI:
   \`\`\`
   npm install -g vercel
   \`\`\`

2. Deploy to Vercel:
   \`\`\`bash
   vercel
   \`\`\`

3. After deployment, you'll receive a URL like `https://farcasino-server.vercel.app`

## Integrating with Your HTML Game

Aby zintegrować serwer z grą, należy użyć kodu z pliku `client-integration.js`.

1. Update the `serverUrl` variable in `client-integration.js` to your Vercel deployment URL:
   \`\`\`javascript
   let serverUrl = 'https://farcasino-server.vercel.app'; // Your Vercel URL
   \`\`\`

2. Add the functions from `client-integration.js` to your HTML game, replacing the existing functions with the same names.

3. Make sure to call `initPlayer()` when starting the game.

## API Endpoints

- `POST /init` - Inicjalizacja nowego gracza
- `POST /spin` - Wykonanie spinu z podaną stawką
- `GET /stats/:playerId` - Pobranie statystyk gracza
- `GET /version` - Informacje o wersji serwera

## RTP Control

The server automatically adjusts the RTP to maintain it around 96% by modifying symbol weights.
