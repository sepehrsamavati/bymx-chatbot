> [!WARNING]
> **This project is deprecated, unmaintained, and archived.**
> This was developed as an experimental personal project and contains several architectural anti-patterns and technical debt. However, the codebase demonstrates a clean, modular structure leveraging Object-Oriented Programming (OOP), Dependency Injection (DI), and an npm workspace monorepo separating the `SDK`, `Telegram bot`, `API`, and `UI` layers. While the structural foundation has good potential for exploration or reference, the software is provided strictly **"as-is"** without any guarantees, security patches, or updates. Anyone choosing to fork, clone, or deploy this code assumes full and sole responsibility for identifying, mitigating, and managing any existing or future security vulnerabilities.

# Baymax AI
AI Chat Bot & Tools

---

<details>
  <summary>📚 Tech stack</summary>

npm workspaces monorepo  
Node.js  
└── ES module system  
MongoDB  
└── Replica Set (transaction)  
fastify  
└── API server and hosting UI (serves from build directory of UI project)  
React  
└── React 19 / React router (non dom) / MUI  

</details>


<details>
  <summary>📦 Requirements</summary>

## NodeJS
Tested on `22.11.0`

## MongoDB - * Replica set required (transaction)
Tested on `6.0.5`

</details>


<details>
  <summary>🛠 Build requirements</summary>

## TypeScript
Core:
- Current: `5.6.3`

API:
- Current: `5.7.3`

Telegram bot:
- Current: `5.6.3`

Core:
- Current: `5.7.2`

## npm
Tested on `10.x` (bundled with Node.js 22)

</details>

<details>
  <summary>ℹ Launch</summary>

  ## 1. Installing dependencies
Run `npm install` from the repository root (installs all workspace packages).

  ## 2. Build
  - All projects: `npm run build` (order: `core` -> `telegramBot` -> `api` -> `ui`)
  - \* API is depended on Telegram bot project (sending OTP - should be fixed by core)

  ## 3. Configure
  - Configure root `.env`

  ## 4. Start
  - Start the project with working directory being the root of solution (seeing `projects` directory as child) and run `node ./projects/start/index.mjs`
</details>

<details>
  <summary>⚙ Config (environment)</summary>

Put `.env` in next-app project directory (clone `.env.example`)

Key | Description
------------ | -------------
`NODE_ENV` | Node environment, `development` or `production`

</details>
