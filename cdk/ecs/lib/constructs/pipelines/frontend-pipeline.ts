import { Artifact, Pipeline, PipelineType, ProviderType } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { CodeBuildAction, CodeStarConnectionsSourceAction, S3DeployAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import path from "path";
import { RemovalPolicy } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import type { Distribution } from "aws-cdk-lib/aws-cloudfront";

interface ServerProps {
  bucket: Bucket;
  distribution: Distribution;
}

export class FrontendPipelineResources extends Construct {
  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const sourceOutput = new Artifact('HackathonNexusFrontendSource');
    const buildOutput = new Artifact('HackathonNexusFrontendBuild');

    const buildProject = new PipelineProject(this, 'HackathonNexusFrontendBuildProject', {
      environment: { buildImage: LinuxBuildImage.AMAZON_LINUX_2023_5 },
      environmentVariables: {
        VITE_API_URL: { value: `https://${props.distribution.distributionDomainName}/api` },
      },
      buildSpec: BuildSpec.fromAsset(path.join(__dirname, "..", "..", "..", "assets", "frontend", "buildspec.yml")),
    });

    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      connectionArn: 'arn:aws:codeconnections:eu-central-1:506285471390:connection/5e78af46-8557-4314-919b-160385bd3367',
      owner: 'Lesnoi-Dmytro',
      repo: 'HackathonNexus',
      branch: 'main',
      output: sourceOutput,
      codeBuildCloneOutput: true,
      triggerOnPush: false,
    });

    const invalidateProject = new PipelineProject(this, 'HackathonNexusFrontendInvalidateCache', {
      environment: { buildImage: LinuxBuildImage.AMAZON_LINUX_2023_5 },
      environmentVariables: {
        DISTRIBUTION_ID: { value: props.distribution.distributionId },
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"',
            ],
          },
        },
      }),
    });

    invalidateProject.addToRolePolicy(new PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [props.distribution.distributionArn],
    }));

    new Pipeline(this, 'HackathonNexusFrontendPipeline', {
      artifactBucket: new Bucket(this, 'ArtifactBucket', {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }),
      pipelineType: PipelineType.V2,
      triggers: [{
        providerType: ProviderType.CODE_STAR_SOURCE_CONNECTION,
        gitConfiguration: {
          sourceAction,
          pushFilter: [{
            branchesIncludes: ['main'],
            filePathsIncludes: ['hackathon-nexus-front/**']
          }],
        },
      }],
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new S3DeployAction({
              actionName: 'Deploy',
              input: buildOutput,
              bucket: props.bucket,
              extract: true,
            }),
            new CodeBuildAction({
              actionName: 'Invalidate',
              project: invalidateProject,
              input: sourceOutput,
              runOrder: 2,
            }),
          ],
        },
      ],
    });
  }
}
