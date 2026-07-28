import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

/**
 * One on-demand table holding one item per user.
 *
 * pk = USER#<cognito sub>, sk = PROGRESS. The generic pk/sk naming leaves
 * room for other item types later (e.g. sk = SUBJECT#dsa#ATTEMPTS) without
 * a second table.
 */
export class DataStack extends Stack {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "ProgressTable", {
      tableName: "learn-duo1c-progress",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      // User progress is the only durable state in the whole system, so the
      // table must survive a `cdk destroy` of the app stacks.
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
