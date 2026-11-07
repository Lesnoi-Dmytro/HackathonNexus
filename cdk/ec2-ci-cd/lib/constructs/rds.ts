import { Duration, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import type { DatabaseParams } from '../types/db-params';

interface RDSProps {
  vpc: Vpc;
  apiSecurityGroup: SecurityGroup;
}

export class RDSResources extends Construct {
  public static DB_PASSWORD_PARAM = '/hackathon-nexus/db/password';

  public instance: DatabaseInstance;
  public securityGroup: SecurityGroup;

  public params: DatabaseParams;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id);

    this.securityGroup = new SecurityGroup(this, 'RDSSecurityGroup', {
      vpc: props.vpc,
      description: 'Security Group for PostgreSQL',
      allowAllOutbound: false,
    });

    const user = 'hackathon_nexus_api';
    const databaseName = 'hackathon_nexus';

    this.instance = new DatabaseInstance(this, 'PostgresInstance', {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_18_3,
      }),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      credentials: Credentials.fromPassword(
        user,
        SecretValue.ssmSecure(RDSResources.DB_PASSWORD_PARAM),
      ),
      databaseName: databaseName,
      port: 5432,
      allocatedStorage: 10,
      maxAllocatedStorage: 20,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: false,
      backupRetention: Duration.days(1),
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
    });
    
    this.params = {
      host: this.instance.instanceEndpoint.hostname,
      port: `${this.instance.instanceEndpoint.port}`,
      user: user,
      passwordParam: RDSResources.DB_PASSWORD_PARAM,
      name: databaseName,
    };

    this.instance.connections.allowFrom(
      Peer.securityGroupId(props.apiSecurityGroup.securityGroupId),
      Port.tcp(5432),
      'Allow PostgreSQL access from the API server',
    );
  }
}
