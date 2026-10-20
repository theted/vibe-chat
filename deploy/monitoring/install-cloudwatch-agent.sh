#!/usr/bin/env bash
# Installs the CloudWatch agent on the EC2 box and (re)starts it with
# cloudwatch-agent.json, which publishes the memory and disk metrics that the
# alarms in monitoring.yml watch. Safe to re-run after changing the config.
#
# Run on the box from the checkout:  bash deploy/monitoring/install-cloudwatch-agent.sh
# The instance needs the role from monitoring.yml first (see README.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/cloudwatch-agent.json"
AGENT_CTL="/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl"
PACKAGE_URL="https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/$(dpkg --print-architecture)/latest/amazon-cloudwatch-agent.deb"

if [[ ! -x "$AGENT_CTL" ]]; then
  echo "==> Installing the CloudWatch agent..."
  DOWNLOAD_DIR="$(mktemp -d)"
  trap 'rm -rf "$DOWNLOAD_DIR"' EXIT
  curl -fsSL "$PACKAGE_URL" -o "$DOWNLOAD_DIR/amazon-cloudwatch-agent.deb"
  sudo dpkg -i -E "$DOWNLOAD_DIR/amazon-cloudwatch-agent.deb"
fi

# fetch-config copies the file into the agent's own directory, so the agent
# doesn't depend on this checkout afterwards
echo "==> Loading $CONFIG_FILE and starting the agent..."
sudo "$AGENT_CTL" -a fetch-config -m ec2 -s -c "file:$CONFIG_FILE"
sudo "$AGENT_CTL" -a status
