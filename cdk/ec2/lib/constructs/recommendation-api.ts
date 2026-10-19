import { Duration, RemovalPolicy, Stack, type SecretValue } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  CloudFormationInit,
  InitCommand,
  InitConfig,
  InitFile,
  InitService,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc
} from 'aws-cdk-lib/aws-ec2';
import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from 'aws-cdk-lib/aws-iam';
import { Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import path from 'path';
import type { DatabaseParams } from '../types/db-params';

interface ServerProps {
  name: string;
  path: string;
  vpc: Vpc;
  databaseParams: DatabaseParams;
  redisUrl: string;
  securityGroup: SecurityGroup;
  mainApiSecurityGroup: SecurityGroup;
  sshPubKeyPath: string;
  cpuType: AmazonLinuxCpuType;
  instanceSize: InstanceSize;
}

export class RecommendationsAPIResources extends Construct {
  public static API_KEY_PARAM = '/hackathon-nexus/recommendations-api/api-key';
  private static BUCKET_KEY_PREFIX = 'hackathon_nexus_recommendation_api';

  public instance: Instance;
  public role: Role;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const assetBucket = new Bucket(this, `${props.name}AssetBucket`, {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      autoDeleteObjects: true,
    });

    const assetDeployment = new BucketDeployment(this, `${props.name}AssetBucketDeployment`, {
      sources: [Source.asset(props.path)],
      destinationBucket: assetBucket,
      destinationKeyPrefix: RecommendationsAPIResources.BUCKET_KEY_PREFIX,
      retainOnDelete: false,
      include: [
        'main.py',
        'requirements-server.txt',
        'api/**',
        'core/**',
        'entities/**',
        'models/recommenders/sage.py',
        'models/recommenders/graph_utils.py',
        'models/output/sage/recommender_sage.pt',
        'models/output/sage/tune_cfg_sage.json',
      ],
      exclude: ['.env'],
      memoryLimit: 256,
    });

    this.role = new Role(this, `${props.name}EC2Role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    this.role.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${props.databaseParams.passwordParam}`],
    }));

    this.role.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${RecommendationsAPIResources.API_KEY_PARAM}`],
    }));

    assetBucket.grants.readWrite(this.role);

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y curl zip unzip',
      'mkdir -p /home/ec2-user/app',
      `aws s3 cp s3://${assetBucket.bucketName}/${RecommendationsAPIResources.BUCKET_KEY_PREFIX} /home/ec2-user/app --recursive`,
      ...this.createPythonInstallCommands(),
      'uv venv --python /opt/python-3.14/bin/python3 /opt/recommendation-venv',
      'uv pip install --python /opt/recommendation-venv/bin/python3 --index-strategy unsafe-best-match --extra-index-url https://download.pytorch.org/whl/cpu -r /home/ec2-user/app/requirements-server.txt',
      ...this.createEnvFileCommands(props.databaseParams, props.redisUrl),
    );

    props.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    props.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    props.securityGroup.addIngressRule(
      props.mainApiSecurityGroup,
      Port.tcp(80),
      'Main API access to recommendations API',
    );

    let instanceClass: InstanceClass;
    if (props.cpuType === AmazonLinuxCpuType.ARM_64) {
      instanceClass = InstanceClass.T4G;
    } else {
      instanceClass = InstanceClass.T3;
    }

    this.instance = new Instance(this, props.name, {
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: InstanceType.of(instanceClass, props.instanceSize),
      machineImage: MachineImage.latestAmazonLinux2023({
        cachedInContext: false,
        cpuType: props.cpuType,
      }),
      userData: userData,
      securityGroup: props.securityGroup,
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['config'],
        },
        configs: {
          config: new InitConfig([
            InitFile.fromAsset(
              '/home/ec2-user/.ssh/authorized_keys',
              props.sshPubKeyPath,
            ),
            InitFile.fromAsset(
              '/etc/systemd/system/hackathon-nexus-recommendation-api.service',
              path.join(__dirname, '../../assets/hackathon-nexus-recommendation-api.service'),
            ),
            InitCommand.shellCommand('systemctl daemon-reload'),
            InitService.enable('hackathon-nexus-recommendation-api', {
              enabled: true,
              ensureRunning: true,
            }),
          ]),
        },
      }),

      initOptions: {
        timeout: Duration.minutes(10),
        includeUrl: true,
        includeRole: true,
        printLog: true,
      },
      role: this.role,
    });

    this.instance.node.addDependency(assetDeployment);
  }
  
  private createPythonInstallCommands(): string[] {
    return [
      'curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh',
      'UV_PYTHON_INSTALL_DIR=/opt/python uv python install 3.14.4',
      'ln -sfn "$(dirname "$(dirname "$(UV_PYTHON_INSTALL_DIR=/opt/python uv python find 3.14.4)")")" /opt/python-3.14',
    ];
  }

  private createEnvFileCommands(dbParams: DatabaseParams, redisUrl: string): string[] {
    const envFile = '/etc/api.env';
    const region = Stack.of(this).region;

    return [
      `install -m 600 -o root -g root /dev/null ${envFile}`,
      `DB_PASSWORD=$(aws ssm get-parameter --name ${dbParams.passwordParam} --with-decryption --query Parameter.Value --output text --region ${region})`,
      `API_KEY=$(aws ssm get-parameter --name ${RecommendationsAPIResources.API_KEY_PARAM} --with-decryption --query Parameter.Value --output text --region ${region})`,
      `printf '%s\\n' 'PORT=80' >> ${envFile}`,
      `printf '%s\\n' 'DB_HOST=${dbParams.host}' 'DB_PORT=${dbParams.port}' 'DB_USER=${dbParams.user}' 'DB_NAME=${dbParams.name}' >> ${envFile}`,
      `printf 'DB_PASSWORD=%s\\n' "$DB_PASSWORD" >> ${envFile}`,
      `printf 'API_TOKEN=%s\\n' "$API_KEY" >> ${envFile}`,
      `printf '%s\\n' 'REDIS_URL=${redisUrl}' >> ${envFile}`,
      'unset DB_PASSWORD API_KEY',
    ];
  }
}
