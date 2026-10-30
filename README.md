# web-app

React + TypeScript app built with Vite, tested with Vitest and React Testing Library, and deployed to Cloudflare Workers.

## Scripts

| Script                   | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `npm run dev` / `start`  | Vite dev server on http://localhost:3000        |
| `npm run build`          | Type-check, then build to `dist/`               |
| `npm run preview`        | Serve the production build with Vite            |
| `npm run preview:worker` | Build and run locally with `wrangler dev`       |
| `npm run deploy`         | Build and `wrangler deploy`                     |
| `npm test`               | Vitest in watch mode                            |
| `npm run test:run`       | Single Vitest run (CI)                          |
| `npm run test:coverage`  | Vitest with V8 coverage (`coverage/index.html`) |
| `npm run typecheck`      | `tsc --noEmit` for the app and tooling configs  |
| `npm run lint`           | ESLint                                          |
| `npm run format`         | Prettier on changed files (`pretty-quick`)      |

Shared test helpers live in `src/test/` (`setup.ts`, `renderWithProviders.tsx`, `mocks/`).
