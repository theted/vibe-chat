# Production monitoring

`monitoring.yml` is one CloudFormation stack for the single EC2 deployment:

| Piece                                       | What it catches                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Synthetics canary `vibe-chat-api`           | Calls `/api/stats` and `/health/detailed` through the public hostname. A run fails on non-JSON, the wrong shape, zero AI services loaded, or Redis or Chroma down. |
| Alarm `vibe-chat-api-canary`                | Two failed runs in a row, or the canary stopped running                                                                                                            |
| Alarms `vibe-chat-memory`, `vibe-chat-disk` | Box memory over 90% for 15 minutes, or root disk over 85%, from the CloudWatch agent. Both cover every app on the box.                                             |
| Alarm `vibe-chat-instance-status`           | EC2 system or instance status check failures                                                                                                                       |
| Log group `/vibe-chat/prod`                 | Output of all five containers, one stream per container, kept 30 days                                                                                              |

Every alarm notifies the SNS topic `vibe-chat-alerts` when it fires, when it
recovers, and when its data stops arriving.

Rough cost: about $5 a month for the canary at the default 10-minute interval,
plus cents for alarms, the two agent metrics and log ingestion.

## Setup

Run from a workstation with `aws login` done, in the instance's region.

**1. Does the instance already have a role?**

```bash
aws ec2 describe-iam-instance-profile-associations \
  --filters Name=instance-id,Values=<instance-id> \
  --query 'IamInstanceProfileAssociations[].IamInstanceProfile.Arn'
```

If this prints a profile, find its role name
(`aws iam get-instance-profile --instance-profile-name <name>`) and pass it as
`ExistingInstanceRoleName` below. The stack then attaches its policy to that
role and creates no role of its own.

**2. Deploy the stack**

```bash
aws cloudformation deploy \
  --stack-name vibe-chat-monitoring \
  --template-file deploy/monitoring/monitoring.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ApiBaseUrl=https://<api-hostname> \
    AlertEmail=<address> \
    InstanceId=<instance-id>
```

Confirm the subscription email from SNS, or no alert arrives.

**3. Attach the role** (skip when you used `ExistingInstanceRoleName`)

```bash
PROFILE=$(aws cloudformation describe-stacks --stack-name vibe-chat-monitoring \
  --query "Stacks[0].Outputs[?OutputKey=='InstanceProfileName'].OutputValue" --output text)
aws ec2 associate-iam-instance-profile --instance-id <instance-id> \
  --iam-instance-profile Name="$PROFILE"
```

Every container on the box can read the role's credentials through instance
metadata. That's why the policy only allows CloudWatch agent metrics and
writes to the one log group.

**4. Start the CloudWatch agent** (on the box, once this directory is deployed)

```bash
cd /opt/vibe-chat && bash deploy/monitoring/install-cloudwatch-agent.sh
```

**5. Turn on log shipping** (on the box)

```bash
# Proves the role works: a failure here would also stop the real containers
docker run --rm --log-driver awslogs --log-opt awslogs-group=/vibe-chat/prod \
  --log-opt tag=smoke-test alpine echo hello
echo 'CLOUDWATCH_LOGS=true' >> /opt/vibe-chat/.env
```

The next deploy recreates the containers with `docker-compose.cloudwatch.yml`.
Re-run the Deploy to EC2 workflow to apply it now.

**6. Check it**

```bash
aws cloudwatch describe-alarms --alarm-name-prefix vibe-chat \
  --query 'MetricAlarms[].[AlarmName,StateValue]' --output table
```

All four should reach `OK` within about 20 minutes. An alarm stuck in
`INSUFFICIENT_DATA` means its metric isn't arriving. For the disk alarm,
check that `RootFsType` matches `df -T /` on the box.

## Changing it

Edit `monitoring.yml` and re-run step 2. The canary script is inline in the
template. For the agent, edit `cloudwatch-agent.json` and re-run step 4.
