import { Duration, SecretValue, Stack } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  LaunchTemplate,
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
import { readFileSync } from 'fs';
import { Construct } from 'constructs';
import type { DatabaseParams } from '../types/db-params';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { ApplicationLoadBalancer, type ApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface RecommendationApiParams {
  apiKeyParam: string;
  originDomainName: string;
}

interface ServerProps {
  name: string;
  vpc: Vpc;
  databaseParams: DatabaseParams;
  securityGroup: SecurityGroup;
  albSecurityGroup: SecurityGroup;
  sshPubKeyPath: string;
  recommendationApiParams: RecommendationApiParams;
  cpuType: AmazonLinuxCpuType;
  instanceSize: InstanceSize;
}

export class MainAPIResources extends Construct {
  public static JWT_SECRET_KEY_PARAM = '/hackathon-nexus/main-api/jwt-secret';

  public asg: AutoScalingGroup;
  public alb: ApplicationLoadBalancer;
  public targetGroup: ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const template = this.createTemplate(props);

    this.asg = new AutoScalingGroup(this, `${props.name}ASG`, {
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      launchTemplate: template,
      minCapacity: 1,
      maxCapacity: 2,
    });

    this.asg.scaleOnCpuUtilization(`${props.name}CpuScaling`, {
      targetUtilizationPercent: 60,
    });

    this.alb = new ApplicationLoadBalancer(this, `${props.name}ALB`, {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      securityGroup: props.albSecurityGroup,
    });

    const listener = this.alb.addListener(`${props.name}Listener`, { port: 80 });

    this.targetGroup = listener.addTargets(`${props.name}Targets`, {
      port: 80,
      targets: [this.asg],
      deregistrationDelay: Duration.seconds(30),
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
      },
    });

    props.securityGroup.addIngressRule(
      Peer.securityGroupId(props.albSecurityGroup.securityGroupId),
      Port.tcp(80),
    );
    props.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    props.albSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
  }

  private createTemplate(props: ServerProps): LaunchTemplate {
    let instanceClass: InstanceClass;
    if (props.cpuType === AmazonLinuxCpuType.ARM_64) {
      instanceClass = InstanceClass.T4G;
    } else {
      instanceClass = InstanceClass.T3;
    }

    const role = new Role(this, `${props.name}EC2Role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    const userData = UserData.forLinux();
    userData.addCommands(
      'sudo yum update -y',
      'sudo yum install -y curl',
      'curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash - ',
      'yum install -y nodejs zip unzip',
      ...this.createEnvFileCommands(props.databaseParams, props.recommendationApiParams, role),
      ...this.configCommands(props.sshPubKeyPath),
      ...this.installAwsCodeDeployAgentCommands(),
    );

    const template = new LaunchTemplate(this, `${props.name}Template`, {
      instanceType: InstanceType.of(instanceClass, props.instanceSize),
      machineImage: MachineImage.latestAmazonLinux2023({
        cachedInContext: false,
        cpuType: props.cpuType,
      }),
      userData: userData,
      role,
      securityGroup: props.securityGroup,
    });

    return template;
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

  private createEnvFileCommands(
    dbParams: DatabaseParams,
    recommendationApiParams: RecommendationApiParams,
    role: Role,
  ): string[] {
    const envFile = '/etc/api.env';
    const region = Stack.of(this).region;

    role.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${dbParams.passwordParam}`],
    }));
    role.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${recommendationApiParams.apiKeyParam}`],
    }));
    role.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${MainAPIResources.JWT_SECRET_KEY_PARAM}`],
    }));

    return [
      `install -m 600 -o root -g root /dev/null ${envFile}`,
      `JWT_SECRET=$(aws ssm get-parameter --name ${MainAPIResources.JWT_SECRET_KEY_PARAM} --with-decryption --query Parameter.Value --output text --region ${region})`,
      `DB_PASSWORD=$(aws ssm get-parameter --name ${dbParams.passwordParam} --with-decryption --query Parameter.Value --output text --region ${region})`,
      `RECOMMEND_API_TOKEN=$(aws ssm get-parameter --name ${recommendationApiParams.apiKeyParam} --with-decryption --query Parameter.Value --output text --region ${region})`,
      `printf '%s\\n' 'PORT=80' 'SEED_DATA=true' 'CORS_ORIGIN=' 'JWT_EXPIRES_IN=7d' >> ${envFile}`,
      `printf 'JWT_SECRET=%s\\n' "$JWT_SECRET" >> ${envFile}`,
      `printf 'RECOMMEND_API_TOKEN=%s\\n' "$RECOMMEND_API_TOKEN" >> ${envFile}`,
      `printf '%s\\n' 'DB_HOST=${dbParams.host}' 'DB_PORT=${dbParams.port}' 'DB_USER=${dbParams.user}' 'DB_NAME=${dbParams.name}' 'RECOMMEND_API_URL=http://${recommendationApiParams.originDomainName}/api' >> ${envFile}`,
      `printf 'DB_PASSWORD=%s\\n' "$DB_PASSWORD" >> ${envFile}`,
      'unset DB_PASSWORD RECOMMEND_API_TOKEN',
    ];
  }

  private configCommands(sshPubKeyPath: string): string[] {
    const sshDir = '/home/ec2-user/.ssh';

    return [
      `install -d -m 700 -o ec2-user -g ec2-user ${sshDir}`,
      ...this.writeFileCommands(`${sshDir}/authorized_keys`, readFileSync(sshPubKeyPath, 'utf8')),
      `chown ec2-user:ec2-user ${sshDir}/authorized_keys`,
      `chmod 600 ${sshDir}/authorized_keys`,
    ];
  }

  private writeFileCommands(filePath: string, content: string): string[] {
    const delimiter = 'HACKATHON_NEXUS_EOF';

    return [
      `cat > ${filePath} <<'${delimiter}'`,
      ...content.trimEnd().split(/\r?\n/),
      delimiter,
    ];
  }
}
