import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";

export class ECRResources extends Construct {
  mainAPIRepository: Repository;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.mainAPIRepository = new Repository(this, 'HackathonNexusContainerRepository', {
      repositoryName: "hackathon-nexus-main-api",
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true, 
    });
  }
}
