import { RemovalPolicy } from 'aws-cdk-lib';
import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { CfnReplicationGroup, CfnSubnetGroup } from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface ElastiCacheProps {
  vpc: Vpc;
  apiSecurityGroup: SecurityGroup;
}

export class ElastiCacheResources extends Construct {
  public static PORT = 6379;

  public replicationGroup: CfnReplicationGroup;
  public securityGroup: SecurityGroup;

  public host: string;
  public port: string;
  public url: string;

  constructor(scope: Construct, id: string, props: ElastiCacheProps) {
    super(scope, id);

    this.securityGroup = new SecurityGroup(this, 'ValkeySecurityGroup', {
      vpc: props.vpc,
      description: 'Security Group for ElastiCache Valkey',
      allowAllOutbound: false,
    });

    const subnetGroup = new CfnSubnetGroup(this, 'ValkeySubnetGroup', {
      description: 'Isolated subnets for ElastiCache Valkey',
      subnetIds: props.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_ISOLATED }).subnetIds,
    });

    this.replicationGroup = new CfnReplicationGroup(this, 'ValkeyReplicationGroup', {
      replicationGroupDescription: 'Valkey cache for Hackathon Nexus',
      engine: 'valkey',
      engineVersion: '8.2',
      cacheNodeType: 'cache.t4g.micro',
      numCacheClusters: 1,
      automaticFailoverEnabled: false,
      multiAzEnabled: false,
      port: ElastiCacheResources.PORT,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [this.securityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      snapshotRetentionLimit: 0,
      autoMinorVersionUpgrade: true,
    });
    this.replicationGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.host = this.replicationGroup.attrPrimaryEndPointAddress;
    this.port = this.replicationGroup.attrPrimaryEndPointPort;
    this.url = `rediss://${this.host}:${this.port}`;

    this.securityGroup.addIngressRule(
      Peer.securityGroupId(props.apiSecurityGroup.securityGroupId),
      Port.tcp(ElastiCacheResources.PORT),
      'Allow Valkey access from the API server',
    );
  }
}
