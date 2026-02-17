# EC2 Deployment (Single Instance + ECR)

This project now targets a single, pre-configured EC2 instance. Docker images are pushed to ECR to keep a full history, and the EC2 host pulls the tagged images during deploy.

## Prerequisites

- An EC2 instance with Docker + Docker Compose v2 installed.
- The instance has permission to pull from ECR (IAM instance role or AWS credentials).
- The repo is checked out on the EC2 instance.
- A `.env` file in the repo root with production settings (API keys, `CLIENT_URL`, etc.).

## GitHub Actions secrets

Configure these in GitHub:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `ECR_REGISTRY` (example: `123456789012.dkr.ecr.us-east-1.amazonaws.com`)
- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_PORT` (optional; defaults to `22`)
- `EC2_APP_PATH` (repo path on the instance, e.g. `/home/ec2-user/vibe-chat`)

## Deploy flow

1. GitHub Actions builds and pushes server/client images to ECR with `latest` and `${GITHUB_SHA}` tags.
2. The workflow SSHs into the EC2 instance, updates the repo, and pulls the tagged images.
3. Docker Compose restarts the stack using `docker-compose.ec2.yml`.

## Manual update (optional)

On the EC2 instance:

```bash
cd /path/to/vibe-chat
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
SERVER_IMAGE=123456789012.dkr.ecr.us-east-1.amazonaws.com/vibe-chat-server:<tag> \
CLIENT_IMAGE=123456789012.dkr.ecr.us-east-1.amazonaws.com/vibe-chat-client:<tag> \
  docker compose -f docker-compose.ec2.yml up -d
```
