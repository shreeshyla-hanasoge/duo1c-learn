import {
  CfnOutput,
  Stack,
  StackProps,
  RemovalPolicy,
  Duration,
} from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface AuthStackProps extends StackProps {
  /** Cognito hosted-UI domain prefix. Must be globally unique. */
  domainPrefix: string;
  /** Every origin the SPA is served from. */
  callbackUrls: string[];
  /**
   * Google OAuth client id — public, so it lives in context, not a secret.
   * When absent the pool deploys without Google so the rest of the stack is
   * not blocked on the Google Cloud Console step.
   */
  googleClientId?: string;
  /** Secrets Manager secret holding `{ "clientSecret": "..." }`. */
  googleSecretName: string;
}

export class AuthStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly hostedUiDomain: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "learn-duo1c",
      // Sign-in is federated only; nobody sets a password here.
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const supported = [cognito.UserPoolClientIdentityProvider.COGNITO];
    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;

    if (props.googleClientId) {
      const secret = secretsmanager.Secret.fromSecretNameV2(
        this,
        "GoogleOAuthSecret",
        props.googleSecretName,
      );

      googleProvider = new cognito.UserPoolIdentityProviderGoogle(
        this,
        "Google",
        {
          userPool: this.userPool,
          clientId: props.googleClientId,
          // Resolved by CloudFormation at deploy time — the secret value never
          // appears in the synthesized template or in version control.
          clientSecretValue: secret.secretValueFromJson("clientSecret"),
          scopes: ["openid", "email", "profile"],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            fullname: cognito.ProviderAttribute.GOOGLE_NAME,
            profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          },
        },
      );

      supported.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }

    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: "learn-duo1c-web",
      // Public SPA client: no secret, PKCE enforced by the authorization
      // code flow. An implicit-flow client would leak tokens in the URL.
      generateSecret: false,
      authFlows: { userSrp: false },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.callbackUrls,
      },
      supportedIdentityProviders: supported,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
    });

    // `supportedIdentityProviders` names the provider as the literal string
    // "Google", which CloudFormation cannot turn into a Ref, so it has no idea
    // the client needs the provider first. The dependency has to be explicit —
    // and it must hang off the CLIENT. Putting it on the user pool creates a
    // cycle, because the provider already depends on the pool.
    if (googleProvider) {
      this.userPoolClient.node.addDependency(googleProvider);
    }

    const domain = this.userPool.addDomain("HostedUi", {
      cognitoDomain: { domainPrefix: props.domainPrefix },
    });
    this.hostedUiDomain = `${props.domainPrefix}.auth.${this.region}.amazoncognito.com`;

    new CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "CognitoDomain", { value: this.hostedUiDomain });
    new CfnOutput(this, "GoogleRedirectUri", {
      value: `${domain.baseUrl()}/oauth2/idpresponse`,
      description:
        "Paste this into the Google OAuth client's Authorised redirect URIs",
    });
    new CfnOutput(this, "GoogleEnabled", {
      value: String(Boolean(props.googleClientId)),
    });
  }
}
