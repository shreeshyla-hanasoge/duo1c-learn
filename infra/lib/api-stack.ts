import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { Construct } from "constructs";
import * as path from "node:path";

export interface ApiStackProps extends StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  /** Origins allowed to call the API (CloudFront, custom domain, localhost). */
  allowedOrigins: string[];
}

export class ApiStack extends Stack {
  readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, "ProgressFn", {
      functionName: "learn-duo1c-progress",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      // Plain asset, no bundler: the handler has zero npm dependencies
      // because the Node 22 runtime already ships AWS SDK v3.
      code: lambda.Code.fromAsset(
        path.join(__dirname, "..", "..", "lambda", "progress"),
      ),
      memorySize: 256,
      timeout: Duration.seconds(10),
      logGroup: new logs.LogGroup(this, "ProgressFnLogs", {
        logGroupName: "/aws/lambda/learn-duo1c-progress",
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        TABLE_NAME: props.table.tableName,
        ALLOWED_ORIGINS: props.allowedOrigins.join(","),
      },
    });

    props.table.grantReadWriteData(fn);

    // Verifies signature, issuer, audience and expiry before the Lambda runs,
    // so the handler can trust `sub` without doing any crypto itself.
    const authorizer = new HttpJwtAuthorizer(
      "CognitoJwt",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      },
    );

    const api = new apigw.HttpApi(this, "Api", {
      apiName: "learn-duo1c",
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["authorization", "content-type"],
        maxAge: Duration.hours(1),
      },
    });

    api.addRoutes({
      path: "/progress",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT],
      integration: new HttpLambdaIntegration("ProgressIntegration", fn),
      authorizer,
    });

    this.apiUrl = api.apiEndpoint;
    new CfnOutput(this, "ApiUrl", { value: this.apiUrl });
  }
}
