#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DataStack } from "../lib/data-stack";
import { AuthStack } from "../lib/auth-stack";
import { ApiStack } from "../lib/api-stack";
import { SiteStack } from "../lib/site-stack";

const app = new cdk.App();

// Account comes from the environment — CDK sets CDK_DEFAULT_ACCOUNT from the
// active AWS profile, so `AWS_PROFILE=you npx cdk deploy` targets your own
// account with no edit here. Deliberately not defaulted: a hardcoded fallback
// is how somebody ends up deploying into the wrong account.
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error(
    "No AWS account resolved. Set AWS_PROFILE (CDK derives CDK_DEFAULT_ACCOUNT " +
      "from it) or export AWS_ACCOUNT_ID explicitly.",
  );
}

const env = {
  account,
  region: process.env.AWS_REGION ?? "ap-south-1",
};

/* ---- Context ------------------------------------------------------- *
 * All of these are supplied with `-c key=value` (or cdk.context.json) so
 * the same code deploys before and after the Google + DNS steps land.  */

const domainName = app.node.tryGetContext("domainName") as string | undefined;
const certificateArn = app.node.tryGetContext("certificateArn") as
  string | undefined;
const googleClientId = app.node.tryGetContext("googleClientId") as
  string | undefined;
const domainPrefix =
  (app.node.tryGetContext("cognitoDomainPrefix") as string | undefined) ??
  "learn-duo1c";
const googleSecretName =
  (app.node.tryGetContext("googleSecretName") as string | undefined) ??
  "learn-duo1c/google-oauth";

const data = new DataStack(app, "LearnDuo1cData", { env });

// The site is reachable on the CloudFront domain from the first deploy and
// on the custom domain once DNS lands, so both are valid OAuth callbacks and
// both must be allowed by CORS. localhost keeps `npm run dev` able to sign in.
const origins = [
  "http://localhost:5173",
  ...(domainName ? [`https://${domainName}`] : []),
  ...((app.node.tryGetContext("cloudfrontUrl") as string | undefined)
    ? [app.node.tryGetContext("cloudfrontUrl") as string]
    : []),
];

const auth = new AuthStack(app, "LearnDuo1cAuth", {
  env,
  domainPrefix,
  // Cognito matches callback URLs exactly, and the app redirects to origin + "/".
  callbackUrls: origins.map((o) => `${o}/`),
  googleClientId,
  googleSecretName,
});

const api = new ApiStack(app, "LearnDuo1cApi", {
  env,
  table: data.table,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
  allowedOrigins: origins,
});
api.addStackDependency(data);
api.addStackDependency(auth);

new SiteStack(app, "LearnDuo1cSite", {
  env,
  domainName,
  certificateArn,
  // A regional wildcard rather than `api.apiUrl`: referencing the token would
  // make the site stack depend on the API stack, so every API change would
  // force a CloudFront update. The looser value still pins scheme, service
  // and region.
  connectSources: [
    `https://*.execute-api.${env.region}.amazonaws.com`,
    `https://${auth.hostedUiDomain}`,
  ],
});

app.synth();
