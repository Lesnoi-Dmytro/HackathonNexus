import { Artifact, Pipeline, PipelineType, ProviderType } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import type { MainAPIResources } from "../main-api";
import { aws_codedeploy, RemovalPolicy } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { CodeBuildAction, CodeDeployServerDeployAction, CodeStarConnectionsSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import path from "path";
import { ServerApplication, ServerDeploymentConfig, ServerDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";

interface ServerProps {
  mainAPi: MainAPIResources;
}

export class MainAPIPipelineResources extends Construct {
  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const deployApp = new ServerApplication(this, 'HackathonNexusMainAPIApp');
    const deploymentGroup = new ServerDeploymentGroup(this, 'HackathonNexusMainAPIDeploymentGroup', {
      application: deployApp,
      autoScalingGroups: [props.mainAPi.asg],
      loadBalancers: [aws_codedeploy.LoadBalancer.application(props.mainAPi.targetGroup)],
      autoRollback: { failedDeployment: true },
      deploymentConfig: ServerDeploymentConfig.ALL_AT_ONCE,
    });

    const sourceOutput = new Artifact('HackathonNexusMainAPISource');
    const buildOutput = new Artifact('HackathonNexusMainAPIBuild');

    const buildProject = new PipelineProject(this, 'HackathonNexusMainAPIBuildProject', {
      environment: { buildImage: LinuxBuildImage.AMAZON_LINUX_2023_5 },
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
              'cdk/ec2-ci-cd/assets/main-api/**',
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
            new CodeDeployServerDeployAction({
              actionName: 'Deploy',
              input: buildOutput,
              deploymentGroup,
            }),
          ],
        },
      ],
    });
  }
}
