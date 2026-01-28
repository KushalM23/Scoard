# SCOARD: See the game blind

A modern, multi-sport score app with data visualization to simulate the feeling of watching the game without watching it

**Live:** [scoard.vercel.app](https://scoard.vercel.app)

![Scoard Preview](preview.png)

## Features

-   **Live Scoreboard:** Real-time updates for all NBA games with live scores, game clock, and quarter information.
-   **Enhanced Virtual Court:** 
    -   **Sequential Playback:** Intelligent event queue system that visualizes plays one-by-one for a broadcast-like feel.
    -   **Dynamic Overlays:** Visual alerts for Timeouts, Substitutions, and Quarter updates.
    -   **Smart Notifications:** Context-aware side popups for points, rebounds, assists, steals, and blocks.
    -   **Accurate Mapping:** Precise shot locations with specific logic for offensive/defensive rebounds and free throws.
-   **Game Schedule:** Browse past results and upcoming fixtures with an intuitive date picker.
-   **Detailed Stats:** Access box scores, play-by-play feeds, and team performance metrics with active player indicators.
-   **League Standings:** Full NBA standings with conference/division rankings, records, and streaks.
-   **Modern UI:** A "Fun Pastel" dark theme featuring glassmorphism, smooth Framer Motion animations, and fully responsive design.
-   **Performance Optimized:** Smart caching strategies - live games cached for 5s, finished games for 24h.

## Tech Stack

-   **Framework:** [Next.js 15](https://nextjs.org/) with App Router
-   **UI Library:** [React 19](https://react.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Animations:** [Framer Motion](https://www.framer.com/motion/)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **HTTP Client:** Axios
-   **Language:** TypeScript
-   **Data Source:** NBA Official CDN & Stats APIs

## Getting Started

### Prerequisites
-   Node.js (v18+ recommended, tested on v22.19.0)
-   [pnpm](https://pnpm.io/) (v10+ recommended)
    ```bash
    npm install -g pnpm
    ```

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/KushalM23/Scoard.git
    cd Scoard
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    ```

### Running the Application

**Development:**
```bash
pnpm dev
# Runs on http://localhost:3000
```

**Production:**
```bash
pnpm build
pnpm start
```

## API Routes

The app includes serverless API routes:

- `GET /api/games/date/[date]` - Fetch all games for a specific date (format: YYYY-MM-DD)
- `GET /api/games/[gameId]` - Get detailed game data including scores, players, and stats
- `GET /api/games/[gameId]/pbp` - Get play-by-play data for live game visualization
- `GET /api/standings` - Fetch current NBA league standings

All routes use NBA's official CDN and Stats APIs with no authentication required.

## Project Structure

```
Scoard/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (serverless functions)
│   │   ├── games/
│   │   │   ├── [gameId]/        # Individual game data & play-by-play
│   │   │   └── date/[date]/     # Games by date with scores
│   │   └── standings/           # NBA standings
│   ├── components/              # React components
│   │   ├── GameCard.tsx         # Game list item
│   │   ├── Header.tsx           # Navigation header
│   │   ├── Hero.tsx             # Hero section with date picker
│   │   ├── Layout.tsx           # Page layout wrapper
│   │   ├── PreviousMatchups.tsx # Team head-to-head history
│   │   ├── Scoreboard.tsx       # Live game scoreboard
│   │   ├── Standings.tsx        # League standings table
│   │   ├── StatsSection.tsx     # Box score stats
│   │   ├── TopPerformers.tsx    # Top players display
│   │   ├── VirtualCourt.tsx     # Animated court visualization
│   │   └── WinProbability.tsx   # Win probability chart
│   ├── game/[gameId]/           # Dynamic game detail pages
│   │   └── page.tsx
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Homepage
│   └── globals.css              # Global styles & theme
├── public/                      # Static assets (images, icons)
├── .gitignore                   # Git ignore rules
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── postcss.config.mjs           # PostCSS config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies & scripts
└── pnpm-lock.yaml               # pnpm lock file
```
## Future updates 
-   Add Power Rankings to NBA
-   Add Player Overview
-   Add Team Overview
-   Add F1 sport
-   Add IPL/cricket

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code:
- Follows the existing TypeScript/React patterns
- Includes proper types for new components/functions
- Works on both desktop and mobile viewports
- Maintains the existing theme and design system
