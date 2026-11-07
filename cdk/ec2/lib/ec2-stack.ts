import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { AmazonLinuxCpuType, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { buildProjects } from './build';
import { MainAPIResources } from './constructs/main-api';
import { RDSResources } from './constructs/rds';
import { ElastiCacheResources } from './constructs/elasticache';
import { VPCResources } from './constructs/vpc';
import { EC2DeploymentProps, envValidator } from './utils/env-validator';
import { RecommendationsAPIResources } from './constructs/recommendation-api';
import { FrontendResources } from './constructs/frontend';
import { CloudFrontResources } from './constructs/cloudfront';
import path from 'path';

export interface EC2StackProps extends StackProps, EC2DeploymentProps {}

export class EC2Stack extends Stack {
  constructor(scope: Construct, id: string, props: EC2StackProps) {
    super(scope, id, props);

    const { sshPubKeyPath } = props;

    envValidator(props);
    console.log('Validated environment');

    const buildPath = buildProjects();

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
      instanceSize: InstanceSize.MICRO,
    });
    console.log('Initialized Recommendations API');

    const serverResources = new MainAPIResources(this, 'HackathonNexusMainAPI', {
      name: 'HackathonNexusMainAPI',
      path: buildPath.apiPath,
      vpc: vpcResources.vpc,
      databaseParams: rdsResources.params,
      albSecurityGroup: vpcResources.mainApiAlbSecurityGroup,
      securityGroup: vpcResources.mainApiSecurityGroup,
      sshPubKeyPath,
      recommendationApiParams: {
        apiKeyParam: RecommendationsAPIResources.API_KEY_PARAM,
        originDomainName: recommendationsResources.instance.instancePrivateDnsName,
      },
      cpuType: AmazonLinuxCpuType.X86_64,
      instanceSize: InstanceSize.NANO,
    });
    console.log('Initialized Main API');

    const frontendResources = new FrontendResources(this, 'HackathonNexusFrontend', {
      name: 'HackathonNexusFrontend',
      path: path.join(buildPath.frontPath, 'dist'),
    });
    console.log('Initialized Frontend');

    const cloudFrontResources = new CloudFrontResources(this, 'HackathonNexusCloudFront', {
      frontendBucket: frontendResources.bucket,
      mainApiOriginDomainName: serverResources.alb.loadBalancerDnsName,
    });
    console.log('Initialized CloudFront');

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
    new CfnOutput(this, 'sshCommand', {
      value: `ssh ec2-user@${serverResources.alb.loadBalancerDnsName}`,
    });
    console.log('Added stack outputs');
  }
}
