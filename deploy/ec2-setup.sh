#!/usr/bin/env bash
# One-time setup for a fresh EC2 instance (Ubuntu 24.04 LTS recommended).
# Run as a non-root user with sudo privileges:  bash deploy/ec2-setup.sh
#
# After this script: copy your .env file to /opt/vibe-chat/.env,
# update deploy/nginx/ec2-vibe-chat.nginx.conf with your domain, then
# push to master to trigger the first deployment.

set -euo pipefail

# Resolve the real target user regardless of whether the script is run with sudo.
# When invoked via `sudo bash ec2-setup.sh`, $USER becomes root but SUDO_USER
# holds the original caller. Fall back to USER for direct (non-sudo) invocations.
DEPLOY_USER="${SUDO_USER:-${USER:-}}"
if [[ -z "$DEPLOY_USER" ]]; then
  echo "ERROR: Could not determine deploy user. Set SUDO_USER or USER." >&2
  exit 1
fi

REPO_URL="https://github.com/theted/vibe-chat.git"
APP_DIR="/opt/vibe-chat"
NGINX_CONF="$APP_DIR/deploy/nginx/ec2-vibe-chat.nginx.conf"
NGINX_LINK="/etc/nginx/sites-enabled/vibe-chat"

# Docker package versions to install and hold.
# Update these when intentionally upgrading Docker.
DOCKER_CE_VERSION="5:27.5.1-1~ubuntu.24.04~noble"
DOCKER_CE_CLI_VERSION="5:27.5.1-1~ubuntu.24.04~noble"
CONTAINERD_VERSION="1.7.25-1"
COMPOSE_PLUGIN_VERSION="2.32.4-1~ubuntu.24.04~noble"

echo "==> Installing Docker (via official APT repository)..."
sudo apt-get update -qq
sudo apt-get install -y ca-certificates curl gnupg

# Docker GPG keyring
sudo install -m 0755 -d /usr/share/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /usr/share/keyrings/docker-archive-keyring.gpg
sudo chmod a+r /usr/share/keyrings/docker-archive-keyring.gpg

# Docker APT source
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y \
  "docker-ce=${DOCKER_CE_VERSION}" \
  "docker-ce-cli=${DOCKER_CE_CLI_VERSION}" \
  "containerd.io=${CONTAINERD_VERSION}" \
  "docker-compose-plugin=${COMPOSE_PLUGIN_VERSION}"

# Prevent unattended upgrades from changing Docker versions
sudo apt-mark hold docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker "$DEPLOY_USER"

echo "==> Installing Nginx..."
sudo apt-get install -y nginx

echo "==> Cloning repository..."
sudo git clone "$REPO_URL" "$APP_DIR"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Creating .env file placeholder..."
if [[ -f "$APP_DIR/.env" ]]; then
  echo "  .env already exists — skipping copy to avoid overwriting secrets."
else
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "  !! Edit $APP_DIR/.env and add your API keys before deploying !!"
  echo ""
fi

echo "==> Configuring Nginx site..."
sudo ln -sf "$NGINX_CONF" "$NGINX_LINK"
sudo rm -f /etc/nginx/sites-enabled/default
echo ""
echo "  !! Edit $NGINX_CONF and replace YOUR_DOMAIN with your actual domain !!"
echo ""
sudo nginx -t && sudo systemctl reload nginx

echo "==> Adding SSH deploy key (optional, skip if using HTTPS)..."
echo "  To allow 'git fetch/checkout' in deployments, either:"
echo "  1. Use HTTPS with a personal access token in the remote URL."
echo "  2. Add an SSH deploy key: ssh-keygen -t ed25519 -C deploy@ec2"
echo "     Then add the public key as a read-only deploy key on GitHub."

echo ""
echo "==> Done! Next steps:"
echo "  1. Edit $APP_DIR/.env with real API keys"
echo "  2. Edit $NGINX_CONF with your domain (replace YOUR_DOMAIN)"
echo "  3. Add GitHub secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY, EC2_HOST_FINGERPRINT"
echo "     (get fingerprint: ssh-keyscan -t ed25519 YOUR_HOST | ssh-keygen -lf - | awk '{print \$2}')"
echo "  4. Push to master to trigger first deployment (uses docker-compose.ec2.yml)"
echo "  5. (Optional) Run: sudo certbot --nginx -d YOUR_DOMAIN  for TLS"
