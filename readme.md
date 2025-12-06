# SCOARD 🏀

A modern, real-time NBA scoreboard application built with React, TypeScript, and Node.js. Scoard provides live scores, detailed game statistics, and an immersive virtual court visualizer, all wrapped in a sleek, glassmorphic UI.

![Scoard Banner](https://via.placeholder.com/1200x600/2D2B35/89CFF0?text=SCOARD+Dashboard)

## ✨ Features

-   **Live Scoreboard:** Real-time updates for all NBA games.
-   **Game Schedule:** Browse past results and upcoming fixtures with an intuitive date picker.
-   **Virtual Court:** Visualize live game actions and shot locations on an interactive court.
-   **Detailed Stats:** Access box scores, play-by-play feeds, and team performance metrics.
-   **Modern UI:** A "Fun Pastel" dark theme featuring glassmorphism and smooth Framer Motion animations.

## 🛠️ Tech Stack

### Frontend
-   **Framework:** [React](https://react.dev/) (via [Vite](https://vitejs.dev/))
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Animations:** [Framer Motion](https://www.framer.com/motion/)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **HTTP Client:** Axios

### Backend
-   **Runtime:** [Node.js](https://nodejs.org/)
-   **Framework:** [Express](https://expressjs.com/)
-   **Language:** TypeScript
-   **Data Source:** NBA Official CDN APIs

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+ recommended)
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/KushalM23/Scoard.git
    cd Scoard
    ```

2.  **Install Dependencies**
    This project uses npm workspaces. You can install dependencies for both frontend and backend from the root:
    ```bash
    npm install
    ```

### Running the Application

You can start both the frontend and backend servers simultaneously using the provided Python script (Windows/Linux):

```bash
python start_servers.py
```

Or run them individually in separate terminals:

**Backend:**
```bash
npm run dev:backend
# Runs on http://localhost:3000
```

**Frontend:**
```bash
npm run dev:frontend
# Runs on http://localhost:5173
```

## 📂 Project Structure

```
Scoard/
├── backend/                # Express server & API proxy
│   ├── src/
│   │   └── server.ts       # Main server entry point
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components (Header, GameCard, etc.)
│   │   ├── pages/          # Route pages (Home, Game)
│   │   └── App.tsx
│   └── package.json
├── start_servers.py        # Script to launch dev environment
└── package.json            # Root configuration & workspaces
```

## 🎨 Theme

The application uses a custom "Fun Pastel" dark theme:
-   **Background:** `#2D2B35` (Charcoal)
-   **Text:** `#FFF5F5` (Lavender Blush)
-   **Primary/Accent:** `#89CFF0` (Baby Blue)
-   **Secondary:** `#B5EAD7` (Mint Green)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.
