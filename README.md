# Baymax AI
AI Chat Bot & Tools


---

<details>
  <summary>📚 Tech stack</summary>

Yarn monorepo  
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

## Yarn
Tested on `4.4.1`

</details>

<details>
  <summary>ℹ Launch</summary>

  ## 1. Installing dependencies
Run `yarn` in
  - root package
  - `core`
  - `api`
  - `telegramBot`
  - `ui`

  ## 2. Build
  - All projects: `yarn run build` (order: `core` -> `telegramBot` -> `api` -> `ui`)
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
