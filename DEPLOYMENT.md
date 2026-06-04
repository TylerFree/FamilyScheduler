# FamilyScheduler Deployment Guide

FamilyScheduler is deployed as a self-hosted Next.js standalone container behind Caddy. This keeps the app portable on Tyler's Linux server while preserving the current browser-local `localStorage` persistence model.

## Assumptions

- Ubuntu/Debian 22.04+ server with SSH key access and sudo available.
- Ports 80 and 443 are open to the internet.
- Docker Engine and the Docker Compose plugin run the app; `scripts/server-setup.sh` can install them on a clean server.
- Caddy is the reverse proxy and manages Let's Encrypt certificates automatically when `DOMAIN` is a real DNS name.
- App data remains in each browser's localStorage for now; no server database is required.
- GitHub Actions deploys to the server over SSH on pushes to `main`.
- The repository origin is `https://github.com/TylerFree/FamilyScheduler.git` at the time this guide was written.

## Prerequisites

1. A Linux server running Ubuntu/Debian 22.04 or newer.
2. SSH key access for the deploy user.
3. `sudo` access for first-time setup.
4. DNS `A`/`AAAA` record pointed at the server if using a domain.
5. Inbound firewall access for TCP ports 80 and 443.

## First-time setup

```bash
sudo mkdir -p /opt/family-scheduler
sudo chown "$USER:$USER" /opt/family-scheduler
git clone https://github.com/TylerFree/FamilyScheduler.git /opt/family-scheduler
cd /opt/family-scheduler
sudo bash ./scripts/server-setup.sh
cp .env.example .env
nano .env
```

Set `DOMAIN=scheduler.example.com` for automatic HTTPS, or use `DOMAIN=:80` for an IP-only/plain-HTTP deployment. Then start production:

```bash
docker compose up -d
```

The app container is intentionally not published directly; Caddy reaches it over the internal Compose `web` network.

## GitHub Actions setup

Add these repository secrets in GitHub: Settings → Secrets and variables → Actions → New repository secret.

- `SSH_HOST`: server DNS name or IP.
- `SSH_USER`: deploy user that can access `/opt/family-scheduler` and run Docker.
- `SSH_KEY`: private SSH key for that user.
- `SSH_PORT`: SSH port. Use `22` unless changed.

Pushes to `main` run `npm ci`, `npm run lint`, `npm test`, `npm run build`, then SSH to the server and run `/opt/family-scheduler/scripts/deploy.sh`.

## Updating

Automatic: push or merge to `main`.

Manual from the server:

```bash
cd /opt/family-scheduler
./scripts/deploy.sh
```

The deploy script pulls the latest code, rebuilds containers, starts them, and prunes old images.

## Backup

- `caddy_data` stores Caddy's TLS certificates and account data. Back it up if you want to avoid certificate reissuance after a server rebuild.
- `caddy_config` stores Caddy runtime config.
- FamilyScheduler event data is currently browser-local via localStorage, so there is no server-side app database to back up yet.

## Logs

```bash
docker compose logs -f app
docker compose logs -f caddy
```

## Future database path

When the team moves off localStorage, add Postgres or Supabase as a third persistence layer. For self-hosted Postgres, add a `db` service with a named volume, move event/member/household writes behind server APIs, and add database backup/restore steps to this guide.

## Troubleshooting

### Port conflicts

If Caddy cannot bind port 80 or 443, another service is already listening. Stop Apache/Nginx or change their ports, then run:

```bash
docker compose up -d caddy
```

### Caddy certificate errors

Confirm DNS points to the server and ports 80/443 are reachable publicly. For IP-only deployments, set `DOMAIN=:80` in `.env` to disable public TLS issuance.

### Build failures

Run the same checks locally or on the server:

```bash
npm ci
npm run lint
npm test
npm run build
docker compose build
```

If Docker cannot pull images, verify outbound network access and Docker Engine status with `systemctl status docker`.

### App is unhealthy

Check the app logs and container status:

```bash
docker compose ps
docker compose logs -f app
```

The Docker healthcheck requests `/` on port 3000 inside the app container.


## Build verification note

On Tyler's current Windows workstation Docker is not installed, so local `docker build -t family-scheduler-test .` cannot run there. The Dockerfile and deployment files were sanity-read locally, and the real image build happens on the Linux server during `scripts/deploy.sh` / GitHub Actions SSH deployment.
