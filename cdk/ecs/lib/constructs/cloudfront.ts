import { Duration } from 'aws-cdk-lib';
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  Distribution,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface CloudFrontProps {
  frontendBucket: IBucket;
  mainApiOriginDomainName: string;
}

export class CloudFrontResources extends Construct {
  public distribution: Distribution;

  constructor(scope: Construct, id: string, props: CloudFrontProps) {
    super(scope, id);

    const mainApiBehavior: BehaviorOptions = {
      origin: new HttpOrigin(props.mainApiOriginDomainName, {
        protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        httpPort: 80,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };

    this.distribution = new Distribution(this, 'Distribution', {
      comment: 'Hackathon Nexus',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(props.frontendBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': mainApiBehavior,
        '/ws*': mainApiBehavior,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.seconds(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.seconds(0) },
      ],
    });
  }
}
