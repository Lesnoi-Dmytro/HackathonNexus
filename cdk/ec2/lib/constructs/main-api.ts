import { Duration, RemovalPolicy, SecretValue, Stack } from 'aws-cdk-lib';
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
import { Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { readFileSync } from 'fs';
import { Construct } from 'constructs';
import path from 'path';
import type { DatabaseParams } from '../types/db-params';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { AdjustmentType } from 'aws-cdk-lib/aws-autoscaling';
import { Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface RecommendationApiParams {
  apiKeyParam: string;
  originDomainName: string;
}

interface ServerProps {
  name: string;
  path: string;
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

  public alb: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const template = this.createTemplate(props);

    const asg = new AutoScalingGroup(this, `${props.name}ASG`, {
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      launchTemplate: template,
      minCapacity: 1,
      maxCapacity: 2,
    });

    asg.scaleOnMetric(`${props.name}CpuScaling`, {
      metric: new Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: { AutoScalingGroupName: asg.autoScalingGroupName },
        statistic: 'Average',
      }),
      scalingSteps: [
        { upper: 40, change: -1 },
        { lower: 80, change: +1 },
      ],
      adjustmentType: AdjustmentType.CHANGE_IN_CAPACITY,
      evaluationPeriods: 2,
    });

    this.alb = new ApplicationLoadBalancer(this, `${props.name}ALB`, {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      securityGroup: props.albSecurityGroup,
    });

    const listener = this.alb.addListener(`${props.name}Listener`, { port: 80 });

    listener.addTargets(`${props.name}Targets`, {
      port: 80,
      targets: [asg],
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

    const assetBucket = new Bucket(this, `${props.name}AssetBucket`, {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      autoDeleteObjects: true,
    });

    const assetDeployment = new BucketDeployment(this, `${props.name}AssetBucketDeployment`, {
      sources: [Source.asset(props.path)],
      destinationBucket: assetBucket,
      destinationKeyPrefix: 'hackathon_nexus_api',
      retainOnDelete: false,
      include: ['node_modules/**', 'dist/**', 'package.json'],
      exclude: ['.env'],
      memoryLimit: 256,
    });

    const role = new Role(this, `${props.name}EC2Role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    assetBucket.grants.readWrite(role);

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y curl',
      'curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash - ',
      'yum install -y nodejs zip unzip',
      'mkdir -p /home/ec2-user/app',
      `aws s3 cp s3://${assetBucket.bucketName}/hackathon_nexus_api /home/ec2-user/app --recursive`,
      ...this.createEnvFileCommands(props.databaseParams, props.recommendationApiParams, role),
      ...this.configCommands(props.sshPubKeyPath),
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

    template.node.addDependency(assetDeployment);

    return template;
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
    const serviceFile = '/etc/systemd/system/hackathon-nexus-api.service';
    const serviceSource = path.join(__dirname, '..', '..', 'assets', 'hackathon-nexus-api.service');

    return [
      `install -d -m 700 -o ec2-user -g ec2-user ${sshDir}`,
      ...this.writeFileCommands(`${sshDir}/authorized_keys`, readFileSync(sshPubKeyPath, 'utf8')),
      `chown ec2-user:ec2-user ${sshDir}/authorized_keys`,
      `chmod 600 ${sshDir}/authorized_keys`,
      ...this.writeFileCommands(serviceFile, readFileSync(serviceSource, 'utf8')),
      'sudo systemctl daemon-reload',
      'sudo systemctl enable --now hackathon-nexus-api',
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
