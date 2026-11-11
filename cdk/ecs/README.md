# HackathonNexus – ECS (Fargate) CDK setup

The main API runs as a container on ECS Fargate. The recommendation API stays on EC2 and the frontend stays on S3 and CloudFront. Deployment is CI/CD driven, like [`../ec2-ci-cd`](../ec2-ci-cd).

Stack name: `ECSHackathonNexusStack`

## Architecture

| Component | Implementation |
|-----------|----------------|
| Network | VPC, security groups for the main API, its ALB and the recommendation API |
| Main API | ECS Fargate service (512 CPU / 1024 MiB, 1–2 tasks, CPU scaling at 70%) in public subnets with a public IP, behind a public ALB. Container port 80, health check `/api/health` |
| Container registry | ECR repository `hackathon-nexus-main-api` (keeps the last 10 images) |
| Recommendation API | Single `MEDIUM` x86_64 EC2 instance |
| Database | RDS PostgreSQL. `DB_PASSWORD`, `JWT_SECRET` and `RECOMMEND_API_TOKEN` reach the container as ECS secrets from SSM |
| Cache | ElastiCache (Valkey) |
| Frontend | S3 bucket behind CloudFront. CloudFront also proxies `/api` to the ALB |

### Pipelines

| Pipeline | Trigger paths | Build | Deploy |
|----------|---------------|-------|--------|
| Main API | `hackathon-nexus-api/**`, `cdk/ecs/assets/main-api/**` | CodeBuild builds and pushes the Docker image to ECR | ECS deploy action (15 min timeout) |
| Recommendation API | `recommendation-api/**`, `cdk/ecs/assets/recommendation-api/**` | CodeBuild | CodeDeploy to the EC2 instance |
| Frontend | `hackathon-nexus-front/**` | CodeBuild | S3 sync, then CloudFront invalidation |

Changes to the CDK code itself (`cdk/ecs/lib/**`) are not deployed by a pipeline. Run `cdk deploy` for those.

## Prerequisites

- Node.js and npm
- AWS CLI configured for the target account and region, and the account bootstrapped (`npx cdk bootstrap`)
- An SSH public key file on disk
- A CodeStar/CodeConnections connection to the GitHub repo, authorised in the console. Its ARN, the repo owner and the repo name are **hardcoded** in `lib/constructs/pipelines/*.ts`
- SSM `SecureString` parameters created **before** deploy:

  | Parameter | Used by |
  |-----------|---------|
  | `/hackathon-nexus/db/password` | RDS, main API |
  | `/hackathon-nexus/recommendations-api/api-key` | recommendation API, main API |
  | `/hackathon-nexus/main-api/jwt-secret` | main API |

## Configuration

| Setting | How to set | Description |
|---------|------------|-------------|
| `SSH_PUB_KEY_PATH` | `.env` or shell | Path to the SSH public key file. Required |
| `initialSetup` | `-c initialSetup=true\|false`, or the `INITIAL_SETUP` env var | `true` runs a placeholder `nginx` image instead of the ECR image. The flag takes precedence over the env var. Default is `false` |
| `imageTag` | `-c imageTag=<tag>` | ECR image tag to run when `initialSetup` is false. Default is `latest` |

## Deploy

The ECR repository is created by this stack and starts empty. If the service points at `:latest` before any image exists, the task fails with `CannotPullContainerError`, the deployment circuit breaker trips, and the stack rolls back. So deploy in two steps.

```bash
npm install

# 1. First deploy: placeholder image, creates ECR, pipelines and everything else
npx cdk deploy -c initialSetup=true

# 2. Push an image: trigger the Main API pipeline (push to main touching
#    hackathon-nexus-api/** or "Release change" in the console) and wait for it to finish.

# 3. Switch the service to the real image
npx cdk deploy -c initialSetup=false
```

PowerShell users can use `$env:INITIAL_SETUP = "true"; npx cdk deploy` instead of the flag.

### Health checks

The container health check (`wget /api/health`) and the ALB health check (`/api/health`, 200) are always enabled, so task definitions registered by the pipeline keep them. During `initialSetup` the placeholder is `nginx:stable-alpine`, started with a command that first creates `/api/health` (body `ok`), so the same checks pass.

### Recovering from a failed first deploy

A stack in `ROLLBACK_COMPLETE` or `CREATE_FAILED` cannot be updated. Delete it (`npx cdk destroy` or the CloudFormation console) and deploy again.

## Outputs

`mainApiEndpoint`, `frontendEndpoint`, `frontendBucketName`, `recommendationsApiEndpoint`, `dbEndpoint`, `valkeyEndpoint`.

## Clean up

```bash
npx cdk destroy
```

The ECR repository is deleted with its images (`emptyOnDelete`).

## Project structure

- `bin/app.ts` – CDK app entry point (reads `initialSetup`)
- `lib/ecs-stack.ts` – stack definition
- `lib/constructs/main-api.ts` – ECS cluster, Fargate task, service, ALB
- `lib/constructs/ecr.ts` – ECR repository
- `lib/constructs/pipelines/` – the three CodePipeline definitions
- `lib/constructs/` – VPC, RDS, ElastiCache, recommendation API, frontend, CloudFront
- `assets/` – buildspecs used by the pipelines
- `lib/utils/env-validator.ts` – input validation
