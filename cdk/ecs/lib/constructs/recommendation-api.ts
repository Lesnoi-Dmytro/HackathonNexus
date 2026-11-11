import { Duration, Stack } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  CloudFormationInit,
  InitConfig,
  InitFile,
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
import { Construct } from 'constructs';
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

  public instance: Instance;
  public role: Role;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    this.role = new Role(this, `${props.name}EC2Role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
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

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y curl zip unzip',
      ...this.createPythonInstallCommands(),
      'uv venv --python /opt/python-3.14/bin/python3 /opt/recommendation-venv',
      'uv pip install --python /opt/recommendation-venv/bin/python3 --index-strategy unsafe-best-match --extra-index-url https://download.pytorch.org/whl/cpu -r /home/ec2-user/app/requirements-server.txt',
      ...this.createEnvFileCommands(props.databaseParams, props.redisUrl),
      ...this.installAwsCodeDeployAgentCommands(),
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

  private installAwsCodeDeployAgentCommands(): string[] {
    return [
      'sudo yum install -y wget',
      `
        #!/bin/bash
        CODEDEPLOY_BIN="/opt/codedeploy-agent/bin/codedeploy-agent"
        $CODEDEPLOY_BIN stop
        yum erase codedeploy-agent -y
      `,
      `wget https://aws-codedeploy-${Stack.of(this).region}.s3.${Stack.of(this).region}.amazonaws.com/latestv2/install`,
      'chmod +x ./install',
      'sudo ./install auto',
    ];
  }
}
