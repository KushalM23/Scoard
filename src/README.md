# Frontend structure

`src/app/` is reserved for Next.js route and API entry points. A route file should be
small: it owns route metadata/params and renders a feature screen.

| Location | Responsibility |
| --- | --- |
| `src/features/home` | Home/scores screen and its calendar, game-card, and standings UI |
| `src/features/game` | Game-detail screen, live court, box score, and related game UI |
| `src/features/playoffs` | Playoff bracket and series screens |
| `src/features/players` | Player-detail client screen |
| `src/features/teams` | Team-detail client screen |
| `src/components` | Cross-feature layout, navigation links, and reusable UI primitives |
| `src/providers` | App-wide React providers |
| `src/lib` | Framework-independent domain/API helpers |
| `src/types` | Shared TypeScript contracts |

For example, the `/` route is `src/app/page.tsx`, while the home screen is composed
in `src/features/home/HomeScreen.tsx`. Small pieces that only belong to that screen
stay local to the screen file; `GameCard` and `Standings` remain separate because
they are substantial feature UI used by the home experience.
