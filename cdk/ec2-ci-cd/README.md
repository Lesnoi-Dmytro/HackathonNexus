# HackathonNexus – EC2 + CI/CD CDK setup

Same EC2-based architecture as [`../ec2`](../ec2), but nothing is built locally. Each component has its own AWS CodePipeline that builds and deploys from GitHub when the relevant files change on `main`.

Stack name: `EC2HackathonNexusStackCICD`

## Architecture

| Component | Implementation |
|-----------|----------------|
| Network | VPC, security groups for the main API, its ALB and the recommendation API |
| Main API | Auto Scaling Group (1–2 `SMALL` x86_64 instances) behind a public ALB |
| Recommendation API | Single `MEDIUM` x86_64 EC2 instance |
| Database | RDS PostgreSQL |
| Cache | ElastiCache (Valkey) |
| Frontend | S3 bucket behind CloudFront |

### Pipelines

All three use a CodeStar (GitHub) connection as the source and run only on pushes to `main` that touch the listed paths.

| Pipeline | Trigger paths | Build | Deploy |
|----------|---------------|-------|--------|
| Main API | `hackathon-nexus-api/**`, `cdk/ec2-ci-cd/assets/main-api/**` | CodeBuild (`assets/main-api/buildspec.yml`) | CodeDeploy to the ASG, with ALB and auto-rollback |
| Recommendation API | `recommendation-api/**`, `cdk/ec2-ci-cd/assets/recommendation-api/**` | CodeBuild | CodeDeploy to the instance tagged `Deploy=recommendation-api` |
| Frontend | `hackathon-nexus-front/**` | CodeBuild (`VITE_API_URL` is set to the CloudFront `/api`) | S3 sync, then CloudFront invalidation |

Changes to the CDK code itself (`cdk/ec2-ci-cd/lib/**`) are not deployed by a pipeline. Run `cdk deploy` for those.

## Prerequisites

- Node.js and npm
- AWS CLI configured for the target account and region, and the account bootstrapped (`npx cdk bootstrap`)
- An SSH public key file on disk
- A CodeStar/CodeConnections connection to the GitHub repo, authorised in the console. Its ARN, the repo owner and the repo name are **hardcoded** in `lib/constructs/pipelines/*.ts`. Change them there if you use a different account or repo
- SSM `SecureString` parameters created **before** deploy:

  | Parameter | Used by |
  |-----------|---------|
  | `/hackathon-nexus/db/password` | RDS, main API, recommendation API |
  | `/hackathon-nexus/recommendations-api/api-key` | recommendation API, main API |

## Configuration

Set in `.env` or in the shell:

| Variable | Description | Required |
|----------|-------------|----------|
| `SSH_PUB_KEY_PATH` | Path to the SSH public key file | yes |

## Deploy

```bash
npm install
npx cdk deploy
```

After the stack is up, the pipelines run on the next matching push. To deploy the code immediately, open each pipeline in the console and choose **Release change**.

## Outputs

`mainApiEndpoint`, `frontendEndpoint`, `frontendBucketName`, `recommendationsApiEndpoint`, `dbEndpoint`, `valkeyEndpoint`, `sshCommand`.

## Clean up

```bash
npx cdk destroy
```

Pipeline artifact buckets are created with `autoDeleteObjects`, so they are removed with the stack.

## Project structure

- `bin/app.ts` – CDK app entry point
- `lib/ec2-ci-cd-stack.ts` – stack definition
- `lib/constructs/` – VPC, RDS, ElastiCache, main API, recommendation API, frontend, CloudFront
- `lib/constructs/pipelines/` – the three CodePipeline definitions
- `assets/` – buildspecs and deploy scripts used by the pipelines
- `lib/utils/env-validator.ts` – input validation
