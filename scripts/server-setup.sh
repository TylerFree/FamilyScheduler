#!/usr/bin/env bash
set -euo pipefail

# FamilyScheduler server bootstrap for Ubuntu/Debian 22.04+.
# Run once on the server with sudo privileges:
#   cd /opt/family-scheduler
#   sudo bash ./scripts/server-setup.sh
# Then copy .env.example to .env, edit DOMAIN, and run:
#   docker compose up -d
#
# This script installs Docker Engine + Compose plugin, enables Docker on boot,
# creates /opt/family-scheduler, and marks deploy.sh executable. The compose
# file's restart: unless-stopped policy keeps app containers running after reboot.

APP_DIR="${APP_DIR:-/opt/family-scheduler}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script supports Ubuntu/Debian systems with apt-get." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo or as root." >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings

if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

. /etc/os-release
ARCH="$(dpkg --print-architecture)"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

mkdir -p "${APP_DIR}"

if [ -n "${SUDO_USER:-}" ] && id "${SUDO_USER}" >/dev/null 2>&1; then
  usermod -aG docker "${SUDO_USER}"
  chown -R "${SUDO_USER}:${SUDO_USER}" "${APP_DIR}"
fi

if [ -f "${APP_DIR}/scripts/deploy.sh" ]; then
  chmod +x "${APP_DIR}/scripts/deploy.sh"
fi

cat <<EOF

Server bootstrap complete.
Next steps:
1. Ensure this repository is cloned at ${APP_DIR}.
2. Copy ${APP_DIR}/.env.example to ${APP_DIR}/.env and set DOMAIN.
3. Run: cd ${APP_DIR} && docker compose up -d
4. Log out/in if you want your user to use docker without sudo.

Containers use restart: unless-stopped, and Docker is enabled on boot.
EOF

