import { Duration, Stack } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  InstanceSize,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
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
import { ApplicationLoadBalancer, type ApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { FargateTaskDefinition, FargateService, Cluster, ContainerImage, LogDrivers, Secret } from 'aws-cdk-lib/aws-ecs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Repository } from 'aws-cdk-lib/aws-ecr';

interface RecommendationApiParams {
  apiKeyParam: string;
  originDomainName: string;
}

interface ServerProps {
  initialSetup: boolean;
  name: string;
  vpc: Vpc;
  repository: Repository;
  databaseParams: DatabaseParams;
  securityGroup: SecurityGroup;
  albSecurityGroup: SecurityGroup;
  recommendationApiParams: RecommendationApiParams;
}

export class MainAPIResources extends Construct {
  public static JWT_SECRET_KEY_PARAM = '/hackathon-nexus/main-api/jwt-secret';

  public readonly containerName = 'hackathon-nexus-main-api';
  public alb: ApplicationLoadBalancer;
  public targetGroup: ApplicationTargetGroup;
  public taskDefinitions: FargateTaskDefinition;
  public service: FargateService;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    const cluster = new Cluster(this, 'HackathonNexusCluster', { vpc: props.vpc });

    this.taskDefinitions = this.createTaskDefinition(props);

    this.service = new FargateService(this, 'HackathonNexusMainAPIService', {
      cluster,
      taskDefinition: this.taskDefinitions, 
      securityGroups: [props.securityGroup],
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      assignPublicIp: true,
      desiredCount: 1,
      circuitBreaker: { rollback: true },
    });
    
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2,
    });

    scaling.scaleOnCpuUtilization('HackathonNexusMainAPICpuScaling', {
      targetUtilizationPercent: 70,
      scaleOutCooldown: Duration.seconds(60),
      scaleInCooldown: Duration.seconds(300),
    });

    this.createAlb(props);

    props.securityGroup.addIngressRule(
      Peer.securityGroupId(props.albSecurityGroup.securityGroupId),
      Port.tcp(80),
    );

    props.albSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
  }

  private createTaskDefinition(props: ServerProps): FargateTaskDefinition {
    const { taskRole, executionRole } = this.createRoles(props);

    const taskDefinition = new FargateTaskDefinition(this, 'HackathonNexusMainAPITaskDefinition', {
      family: 'hackathon-nexus-main-api',
      cpu: 512,
      memoryLimitMiB: 1024,
      taskRole,
      executionRole,
    });

    taskDefinition.addContainer("HackathonNexusMainAPIContainer", {
      containerName: "hackathon-nexus-main-api",
      image: props.initialSetup
        ? ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:stable')
        : ContainerImage.fromEcrRepository(
            props.repository,
            this.node.tryGetContext('imageTag') ?? 'latest',
          ),
      portMappings: [{ containerPort: 80 }],
      logging: LogDrivers.awsLogs({ streamPrefix: 'main-api' }),
      environment: {
        DB_HOST: props.databaseParams.host,
        DB_PORT: String(props.databaseParams.port),
        DB_USER: props.databaseParams.user,
        DB_NAME: props.databaseParams.name,
        SEED_DATA: 'true',
        CORS_ORIGIN: '',
        JWT_EXPIRES_IN: '7d',
        RECOMMEND_API_URL: `http://${props.recommendationApiParams.originDomainName}/api`,
      },
      secrets: {
        RECOMMEND_API_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, 'RecommendApiTokenParam', {
            parameterName: props.recommendationApiParams.apiKeyParam,
          }),
        ),
        DB_PASSWORD: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, 'DbPasswordParam', {
            parameterName: props.databaseParams.passwordParam,
          }),
        ),
        JWT_SECRET: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, 'JwtSecretParam', {
            parameterName: MainAPIResources.JWT_SECRET_KEY_PARAM,
          }),
        ),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:80/api/health || exit 1'],
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(30),
        interval: Duration.seconds(30),
        retries: 3,
      },
    });

    return taskDefinition;
  }

  private createAlb(props: ServerProps): void {
    this.alb = new ApplicationLoadBalancer(this, `${props.name}ALB`, {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      securityGroup: props.albSecurityGroup,
    });

    const listener = this.alb.addListener(`${props.name}Listener`, { port: 80 });

    this.targetGroup = listener.addTargets(`${props.name}Targets`, {
      port: 80,
      targets: [this.service],
      deregistrationDelay: Duration.seconds(30),
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
      },
    });
  }
  
  private createRoles(props: ServerProps): { taskRole: Role, executionRole: Role } {
    const taskRole = new Role(this, `${props.name}TaskRole`, {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const executionRole = new Role(this, `${props.name}ExecutionRole`, {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    executionRole.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameters'],
      resources: [
        `arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${props.databaseParams.passwordParam}`,
        `arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${props.recommendationApiParams.apiKeyParam}`,
        `arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter${MainAPIResources.JWT_SECRET_KEY_PARAM}`,
      ],
    }));

    return { taskRole, executionRole };
  }
}
