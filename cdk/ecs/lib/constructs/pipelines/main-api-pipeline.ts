import { Artifact, Pipeline, PipelineType, ProviderType } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import type { MainAPIResources } from "../main-api";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { CodeBuildAction, CodeStarConnectionsSourceAction, EcsDeployAction } from "aws-cdk-lib/aws-codepipeline-actions";
import path from "path";
import type { Repository } from "aws-cdk-lib/aws-ecr";

interface ServerProps {
  mainAPi: MainAPIResources;
  repository: Repository;
}

export class MainAPIPipelineResources extends Construct {
  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const sourceOutput = new Artifact('HackathonNexusMainAPISource');
    const buildOutput = new Artifact('HackathonNexusMainAPIBuild');

    const buildProject = new PipelineProject(this, 'HackathonNexusMainAPIBuildProject', {
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2023_5,
        privileged: true,
      },
      environmentVariables: {
        PORT: { value: '80' },
        REPO_URI: { value: props.repository.repositoryUri },
        CONTAINER_NAME: { value: props.mainAPi.containerName },
      },
      buildSpec: BuildSpec.fromAsset(path.join(__dirname, "..", "..", "..", "assets", "main-api", "buildspec.yml")),
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

    props.repository.grantPullPush(buildProject);

    new Pipeline(this, 'ApiPipeline', {
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
            filePathsIncludes: [
              'hackathon-nexus-api/**',
              'cdk/ecs/assets/main-api/**',
            ]
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
            new EcsDeployAction({
              actionName: 'Deploy',
              service: props.mainAPi.service,
              input: buildOutput,
              deploymentTimeout: Duration.minutes(15),
            }),
          ],
        },
      ],
    });
  }
}
