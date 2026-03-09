#!/usr/bin/env bash
# One-time setup for a fresh EC2 instance (Ubuntu 24.04 LTS recommended).
# Run as a user with sudo privileges, NOT as root.
#
# After this script: copy your .env file to /opt/vibe-chat/.env,
# update deploy/nginx/ec2-vibe-chat.nginx.conf with your domain, then
# push to master to trigger the first deployment.

set -euo pipefail

REPO_URL="https://github.com/theted/vibe-chat.git"
APP_DIR="/opt/vibe-chat"
NGINX_CONF="$APP_DIR/deploy/nginx/ec2-vibe-chat.nginx.conf"
NGINX_LINK="/etc/nginx/sites-enabled/vibe-chat"

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

echo "==> Installing Nginx..."
sudo apt-get install -y nginx

echo "==> Cloning repository..."
sudo git clone "$REPO_URL" "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

echo "==> Creating .env file placeholder..."
cp "$APP_DIR/.env.example" "$APP_DIR/.env"
echo ""
echo "  !! Edit $APP_DIR/.env and add your API keys before deploying !!"
echo ""

echo "==> Configuring Nginx site..."
sudo ln -sf "$NGINX_CONF" "$NGINX_LINK"
sudo rm -f /etc/nginx/sites-enabled/default
echo ""
echo "  !! Edit $NGINX_CONF and replace YOUR_DOMAIN with your actual domain !!"
echo ""
sudo nginx -t && sudo systemctl reload nginx

echo "==> Adding SSH deploy key (optional, skip if using HTTPS)..."
echo "  To allow 'git pull' in deployments, either:"
echo "  1. Use HTTPS with a personal access token in the remote URL."
echo "  2. Add an SSH deploy key: ssh-keygen -t ed25519 -C deploy@ec2"
echo "     Then add the public key as a read-only deploy key on GitHub."

echo ""
echo "==> Done! Next steps:"
echo "  1. Edit $APP_DIR/.env with real API keys"
echo "  2. Edit $NGINX_CONF with your domain (replace YOUR_DOMAIN)"
echo "  3. Add GitHub secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY"
echo "  4. Push to master to trigger first deployment (uses docker-compose.ec2.yml)"
echo "  5. (Optional) Run: sudo certbot --nginx -d YOUR_DOMAIN  for TLS"
