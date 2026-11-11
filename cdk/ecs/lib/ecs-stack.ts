import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { AmazonLinuxCpuType, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { MainAPIResources } from './constructs/main-api';
import { RDSResources } from './constructs/rds';
import { ElastiCacheResources } from './constructs/elasticache';
import { VPCResources } from './constructs/vpc';
import { EC2CICDDeploymentProps as ECSDeploymentProps, envValidator } from './utils/env-validator';
import { RecommendationsAPIResources } from './constructs/recommendation-api';
import { FrontendResources } from './constructs/frontend';
import { CloudFrontResources } from './constructs/cloudfront';
import path from 'path';
import { MainAPIPipelineResources } from './constructs/pipelines/main-api-pipeline';
import { FrontendPipelineResources } from './constructs/pipelines/frontend-pipeline';
import { RecommendationAPIPipelineResources } from './constructs/pipelines/recommendation-api-pipeline';
import { ECRResources } from './constructs/ecr';

export interface CDKStackProps extends StackProps, ECSDeploymentProps {}

export class CDKStack extends Stack {
  constructor(scope: Construct, id: string, props: CDKStackProps) {
    super(scope, id, props);

    const { sshPubKeyPath } = props;

    envValidator(props);
    console.log('Validated environment');

    const vpcResources = new VPCResources(this, 'VPC');
    console.log('Initialized VPC');

    const rdsResources = new RDSResources(this, 'RDS', {
      vpc: vpcResources.vpc,
      apiSecurityGroup: vpcResources.mainApiSecurityGroup,
    });
    console.log('Initialized RDS');

    const elastiCacheResources = new ElastiCacheResources(this, 'ElastiCache', {
      vpc: vpcResources.vpc,
      apiSecurityGroup: vpcResources.mainApiSecurityGroup,
    });
    console.log('Initialized ElastiCache');

    const recommendationsResources = new RecommendationsAPIResources(this, 'HackathonNexusRecommendationAPI', {
      name: 'HackathonNexusRecommendationAPI',
      path: path.join(__dirname, '..', '..', '..', 'recommendation-api'),
      vpc: vpcResources.vpc,
      databaseParams: rdsResources.params,
      redisUrl: elastiCacheResources.url,
      securityGroup: vpcResources.recommendationApiSecurityGroup,
      mainApiSecurityGroup: vpcResources.mainApiSecurityGroup,
      sshPubKeyPath,
      cpuType: AmazonLinuxCpuType.X86_64,
      instanceSize: InstanceSize.MEDIUM,
    });
    console.log('Initialized Recommendations API');

    new RecommendationAPIPipelineResources(this, 'HackathonNexusRecommendationAPIPipeline', {
      instance: recommendationsResources.instance
    });
    console.log('Initialized Recommendations API Pipeline');

    const ecr = new ECRResources(this, 'HackathonNexusContinerRepository');

    const mainApiResources = new MainAPIResources(this, 'HackathonNexusMainAPI', {
      name: 'HackathonNexusMainAPI',
      vpc: vpcResources.vpc,
      databaseParams: rdsResources.params,
      albSecurityGroup: vpcResources.mainApiAlbSecurityGroup,
      securityGroup: vpcResources.mainApiSecurityGroup,
      repository: ecr.mainAPIRepository,
      recommendationApiParams: {
        apiKeyParam: RecommendationsAPIResources.API_KEY_PARAM,
        originDomainName: recommendationsResources.instance.instancePrivateDnsName,
      },
      initialSetup: props.initialSetup,
    });
    console.log('Initialized Main API');

    new MainAPIPipelineResources(this, 'HackathonNexusMainAPIPipeline', {
      mainAPi: mainApiResources,
      repository: ecr.mainAPIRepository,
    });
    console.log('Initialized Main API CI/CD Pipeline');

    const frontendResources = new FrontendResources(this, 'HackathonNexusFrontend', {
      name: 'HackathonNexusFrontend',
    });
    console.log('Initialized Frontend');

    const cloudFrontResources = new CloudFrontResources(this, 'HackathonNexusCloudFront', {
      frontendBucket: frontendResources.bucket,
      mainApiOriginDomainName: mainApiResources.alb.loadBalancerDnsName,
    });
    console.log('Initialized CloudFront');

    new FrontendPipelineResources(this, 'HackathonNexusFrontendPipeline', {
      bucket: frontendResources.bucket,
      distribution: cloudFrontResources.distribution,
    });
    console.log('Initialized Frontend CI/CD Pipeline');

    new CfnOutput(this, 'mainApiEndpoint', {
      value: `https://${cloudFrontResources.distribution.distributionDomainName}/api`,
    });
    new CfnOutput(this, 'recommendationsApiEndpoint', {
      value: `http://${recommendationsResources.instance.instancePublicIp}`,
    });
    new CfnOutput(this, 'frontendBucketName', {
      value: frontendResources.bucket.bucketName,
    });
    new CfnOutput(this, 'frontendEndpoint', {
      value: `https://${cloudFrontResources.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'dbEndpoint', {
      value: rdsResources.instance.instanceEndpoint.hostname,
    });
    new CfnOutput(this, 'valkeyEndpoint', {
      value: elastiCacheResources.host,
    });
    console.log('Added stack outputs');
  }
}
