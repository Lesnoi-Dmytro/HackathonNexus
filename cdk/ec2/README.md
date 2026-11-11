# HackathonNexus – EC2 CDK setup

Deploys the whole HackathonNexus stack to AWS on plain EC2 instances. Artifacts are **built locally** during `cdk deploy` and shipped to the instances as CDK assets. There is no CI/CD, so every code change needs a new `cdk deploy`.

Stack name: `EC2HackathonNexusStack`

## Architecture

| Component | Implementation |
|-----------|----------------|
| Network | VPC with public/private subnets, separate security groups for the main API, its ALB and the recommendation API |
| Main API | Auto Scaling Group (1–2 `NANO` x86_64 instances) behind a public Application Load Balancer |
| Recommendation API | Single `MICRO` x86_64 EC2 instance, reachable from the main API via its private DNS name |
| Database | RDS PostgreSQL (password read from SSM) |
| Cache | ElastiCache (Valkey) |
| Frontend | Static files in an S3 bucket |
| Entry point | CloudFront. It serves the frontend from S3 and proxies `/api` to the main API ALB |

## Prerequisites

- Node.js and npm
- AWS CLI configured for the target account and region, and the account bootstrapped (`npx cdk bootstrap`)
- Everything needed to build `hackathon-nexus-api` and `hackathon-nexus-front` locally (see `lib/build/`). Builds go to `build_tmp/`
- An SSH public key file on disk
- SSM `SecureString` parameters created **before** deploy (the stack only reads them):

  | Parameter | Used by |
  |-----------|---------|
  | `/hackathon-nexus/db/password` | RDS, main API, recommendation API |
  | `/hackathon-nexus/recommendations-api/api-key` | recommendation API, main API |

## Configuration

Set in `.env` (loaded with dotenv) or in the shell:

| Variable | Description | Required |
|----------|-------------|----------|
| `SSH_PUB_KEY_PATH` | Path to the SSH public key file. It must exist, or the stack throws | yes |

## Deploy

```bash
npm install
npx cdk deploy
```

## Outputs

`mainApiEndpoint`, `frontendEndpoint`, `frontendBucketName`, `recommendationsApiEndpoint`, `dbEndpoint`, `valkeyEndpoint`, `sshCommand`.

## Updating

Re-run `npx cdk deploy`. The API and frontend are rebuilt locally and redeployed.

## Clean up

```bash
npx cdk destroy
```

## Project structure

- `bin/app.ts` – CDK app entry point
- `lib/ec2-stack.ts` – stack definition
- `lib/build/` – local build of the API and frontend
- `lib/constructs/` – VPC, RDS, ElastiCache, main API, recommendation API, frontend, CloudFront
- `lib/utils/env-validator.ts` – input validation
