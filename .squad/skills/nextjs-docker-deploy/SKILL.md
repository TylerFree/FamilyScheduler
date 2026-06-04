# Next.js Docker Deploy Skill

Use this pattern when a Next.js app needs a portable self-hosted deployment target.

## Pattern

1. Set `output: "standalone"` in `next.config.ts`.
2. Use a three-stage Dockerfile:
   - `deps`: `node:20-alpine`, copy package manifests, run `npm ci`.
   - `builder`: copy dependencies and source, run `npm run build`.
   - `runner`: copy `.next/standalone`, `.next/static`, and `public`; run as non-root; `CMD ["node", "server.js"]`.
3. Put the app behind a reverse proxy instead of publishing the app port directly.
4. For Caddy, keep the site address env-driven: `{$DOMAIN::80}` supports both HTTPS domains and IP-only HTTP.
5. Deploy with `docker compose build && docker compose up -d`.

## Notes

- Keep `NEXT_TELEMETRY_DISABLED=1` in all build/runtime stages.
- Add a container `HEALTHCHECK` against `/`.
- Exclude `.next`, `node_modules`, `.git`, design assets, squad files, docs, tests, and CI files from the Docker build context.
- If the app still uses browser `localStorage`, do not invent server backup steps for app data; document the future database migration path instead.
