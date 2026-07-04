# Baymax UI

Vite + React SPA served at `/ui/` by the API server.

## Development

```bash
npm run dev -w bymx-ui
```

Dev server proxies `/api` to `http://localhost:3017`.

## Production build

```bash
npm run build -w bymx-ui
```

Output is written to `dist/` and served by `bymx-api-server` from `/ui`.
