import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import * as path from "node:path";

export interface SiteStackProps extends StackProps {
  /** Custom domain, e.g. learn.duo1c.in. Omitted until the cert is issued. */
  domainName?: string;
  /** ACM cert ARN in us-east-1. Required by CloudFront for a custom domain. */
  certificateArn?: string;
  /** Connect-src entries the page is allowed to call. */
  connectSources: string[];
}

export class SiteStack extends Stack {
  readonly distributionDomain: string;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    // Private bucket: CloudFront reaches it through Origin Access Control, so
    // there is no public website endpoint and no bucket policy for the world.
    const bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `learn-duo1c-site-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const csp = [
      "default-src 'self'",
      // Vite emits a small inline module preload shim; styles are inlined by
      // Tailwind's build. Scripts stay 'self' only — no CDNs anywhere.
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      // Google profile pictures come from lh3.googleusercontent.com.
      "img-src 'self' data: https://lh3.googleusercontent.com",
      "font-src 'self' data:",
      `connect-src 'self' ${props.connectSources.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const headers = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeaders",
      {
        responseHeadersPolicyName: "learn-duo1c-security-headers",
        securityHeadersBehavior: {
          contentSecurityPolicy: { contentSecurityPolicy: csp, override: true },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
        },
      },
    );

    /**
     * The lab worker is the one file permitted `unsafe-eval`, because running
     * reader-written code requires `new Function`.
     *
     * A dedicated, same-origin worker gets its CSP from ITS OWN response
     * headers rather than inheriting the document's — so scoping the
     * exception here keeps the page itself on a strict `script-src 'self'`.
     * A blob-URL worker would inherit instead, which is precisely why the
     * worker is loaded from a real path.
     */
    const workerHeaders = new cloudfront.ResponseHeadersPolicy(
      this,
      "WorkerHeaders",
      {
        responseHeadersPolicyName: "learn-duo1c-lab-worker-headers",
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy:
              "default-src 'none'; script-src 'self' 'unsafe-eval'",
            override: true,
          },
          contentTypeOptions: { override: true },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
        },
      },
    );

    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, "Cert", props.certificateArn)
      : undefined;

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "learn-duo1c",
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        responseHeadersPolicy: headers,
      },
      // Hash routing means every deep link is really `/`, but a stray path
      // (or the OAuth redirect landing before the SPA loads) must still get
      // the app rather than an S3 error document.
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
      ...(certificate && props.domainName
        ? { certificate, domainNames: [props.domainName] }
        : {}),
      additionalBehaviors: {
        // Same origin and cache policy as everything else — only the
        // response headers differ.
        "/assets/lab-worker.js": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
          responseHeadersPolicy: workerHeaders,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "..", "..", "dist")),
      ],
      destinationBucket: bucket,
      distribution,
      // index.html must never be cached long or a deploy is invisible; the
      // hashed assets under /assets are immutable and handled by the
      // CACHING_OPTIMIZED policy above.
      // The worker has a stable, unhashed filename so CloudFront can
      // path-match its CSP — which means it must be invalidated explicitly.
      distributionPaths: ["/index.html", "/", "/assets/lab-worker.js"],
      prune: true,
    });

    this.distributionDomain = distribution.distributionDomainName;

    new CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    if (props.domainName) {
      new CfnOutput(this, "CustomDomainUrl", {
        value: `https://${props.domainName}`,
      });
      new CfnOutput(this, "DnsRecordToAdd", {
        value: `${props.domainName} CNAME ${distribution.distributionDomainName}`,
        description: "Add this at the duo1c.in DNS provider",
      });
    }
  }
}
