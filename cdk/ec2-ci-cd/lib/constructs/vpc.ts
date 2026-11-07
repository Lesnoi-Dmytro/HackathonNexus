import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VPCResources extends Construct {
  public vpc: Vpc;

  public mainApiSecurityGroup: SecurityGroup;
  public mainApiAlbSecurityGroup: SecurityGroup;
  public recommendationApiSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'HackathonNexusAPI',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
        {
          cidrMask: 24,
          name: 'HackathonNexusResources',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
      // RDS subnet groups require subnets in at least two AZs
      maxAzs: 2,
    });

    this.mainApiSecurityGroup = new SecurityGroup(this, 'HackathonNexusMainApiSecurityGroup', {
      vpc: this.vpc,
      description: 'Hackathon Nexus main API',
      allowAllOutbound: true,
    });

    this.mainApiAlbSecurityGroup = new SecurityGroup(this, 'HackathonNexusMainApiALBSecurityGroup', {
      vpc: this.vpc,
      description: 'Hackathon Nexus main API ALB',
      allowAllOutbound: true,
    });

    this.recommendationApiSecurityGroup = new SecurityGroup(this, 'HackathonNexusRecommendationApiSecurityGroup', {
      vpc: this.vpc,
      description: 'Hackathon Nexus recommendations API',
      allowAllOutbound: true,
    });
  }
}
