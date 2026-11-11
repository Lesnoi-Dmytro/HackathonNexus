import { RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

interface ServerProps {
  name: string;
}

export class FrontendResources extends Construct {
  public bucket: Bucket;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    this.bucket = new Bucket(this, `${props.name}Bucket`, {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      autoDeleteObjects: true,
      enforceSSL: true,
    });
  }
}
