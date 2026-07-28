# Runbook

Operating duo1c Learn. Account **<ACCOUNT_ID>**, profile `default`, region **ap-south-1**
(ACM cert in us-east-1).

> **Identifiers are placeholders.** This repository is public, so account-specific handles —
> `<ACCOUNT_ID>`, `<CERT_ID>`, `<DISTRIBUTION_ID>`, `<USER_POOL_ID>`, `<APP_CLIENT_ID>`,
> `<API_ID>` — are redacted. None of them is a credential; they are simply not worth
> publishing. Pull the live values for your own deployment straight from CloudFormation:
>
> ```bash
> aws cloudformation describe-stacks --stack-name LearnDuo1cSite \
>   --query 'Stacks[0].Outputs' --output table --region ap-south-1
> ```
>
> Substitute `LearnDuo1cAuth` or `LearnDuo1cApi` for the Cognito and API values. Your account
> ID is `aws sts get-caller-identity --query Account --output text`.

---

## 1. Deploy

```bash
./scripts/deploy.sh \
  --domain learn.duo1c.in \
  --cert arn:aws:acm:us-east-1:<ACCOUNT_ID>:certificate/<CERT_ID> \
  --google-client-id 341461601598-pvt64unfhql5898n5s1u4rec3onsfjjv.apps.googleusercontent.com
```

Omitting a flag degrades gracefully rather than failing: no `--google-client-id` deploys the
pool without Google and the app hides the sign-in button; no `--domain`/`--cert` leaves the
site on the CloudFront URL only.

### Why the script has passes

Vite bakes `VITE_*` into the bundle at **build** time, but Cognito and API values only exist
after those stacks are created. So:

1. **Pass 1** — read the existing CloudFront URL, then deploy `Data`, `Auth`, `Api`.
   _The URL must be read before this pass, not after: the Cognito callback list is written
   here._
2. Write `.env.production` from the stack outputs, `npm run build`.
3. **Pass 2** — deploy `Site` (uploads `dist/`, invalidates `/index.html` and `/`).
4. **Pass 3** — only on the very first run, when the site URL did not exist during pass 1:
   re-deploy `Auth`/`Api` so the CloudFront origin becomes a valid callback.

### Content-only change

Editing curriculum, quizzes or a visualiser touches no infrastructure. The script is still
the right entry point — passes 1 and 3 will report "no changes" in seconds.

### Verify a deploy

```bash
curl -sI https://learn.duo1c.in/ | head -1
```

Then hard-reload the page. `index.html` is invalidated on every deploy; the hashed assets
under `/assets` are immutable and need no invalidation.

---

## 2. Logs and inspection

```bash
aws logs tail /aws/lambda/learn-duo1c-progress --follow --region ap-south-1 --profile default
```

Read one user's stored progress (`sub` comes from the id token, or from the Cognito console):

```bash
aws dynamodb get-item --table-name learn-duo1c-progress --region ap-south-1 --profile default --key '{"pk":{"S":"USER#<sub>"},"sk":{"S":"PROGRESS"}}'
```

Current stack outputs:

```bash
aws cloudformation describe-stacks --stack-name LearnDuo1cAuth --region ap-south-1 --profile default --query 'Stacks[0].Outputs' --output table
```

---

## 3. Troubleshooting

### 403 "Bad request" from CloudFront on the custom domain

DNS resolves to the distribution, but the distribution has no matching **alias**, so
CloudFront rejects the `Host` header. Check:

```bash
aws cloudfront get-distribution --id <DISTRIBUTION_ID> --profile default --query 'Distribution.DistributionConfig.Aliases' --output json
```

Empty means the `Site` stack has not been deployed with `--domain`/`--cert`, usually because
an earlier stack in the run failed. Fix the earlier failure and re-run the deploy. _This is
not a DNS problem_ — verify separately with `dig +short learn.duo1c.in @8.8.8.8`.

### `Circular dependency between resources` on LearnDuo1cAuth

The Google identity provider already depends on the user pool (it takes `userPool:`), so any
`userPool.node.addDependency(googleProvider)` closes a loop and drags the hosted-UI domain
and app client in with it.

The dependency _is_ needed — `supportedIdentityProviders: ["Google"]` is a literal string
CloudFormation cannot turn into a `Ref` — but it belongs on the **client**:

```ts
if (googleProvider) this.userPoolClient.node.addDependency(googleProvider);
```

### Sign-in fails with `redirect_mismatch`

Cognito matches callback URLs **exactly**, and the app redirects to `origin + "/"` (note the
trailing slash). Check what is registered:

```bash
aws cognito-idp describe-user-pool-client --user-pool-id <USER_POOL_ID> --client-id <APP_CLIENT_ID> --region ap-south-1 --profile default --query 'UserPoolClient.CallbackURLs'
```

Should list `http://localhost:5173/`, `https://<DIST_DOMAIN>.cloudfront.net/` and
`https://learn.duo1c.in/`. The list is built in `infra/bin/learn.ts` from the `origins`
array.

### The sign-in button does not render

`authEnabled` requires **all four** of `VITE_COGNITO_DOMAIN`, `VITE_COGNITO_CLIENT_ID`,
`VITE_API_URL` and `VITE_GOOGLE_ENABLED=true` in the built bundle. Check what the deploy
generated:

```bash
cat .env.production
```

`VITE_GOOGLE_ENABLED=false` means the `Auth` stack was deployed without `--google-client-id`.

### Sidebar shows "Sync failed"

The message is the HTTP status from `/progress`. Localise it:

- **401** — token expired and refresh failed; sign out and back in.
- **403** — CORS. The caller's origin is not in `ALLOWED_ORIGINS` on the Lambda, or not in
  the API's `corsPreflight`. Both come from `origins` in `infra/bin/learn.ts`.
- **413** — payload over 300 KB. Should be impossible; investigate before raising the limit.
- **5xx** — check the Lambda logs.

Sync failing never blocks the app: local progress keeps working and the next change
re-attempts a push.

### Something is blocked by the CSP

The policy is built in `infra/lib/site-stack.ts`. Browser console names the violated
directive. Adding an external origin means editing `csp` there and redeploying `Site` —
prefer self-hosting the asset instead.

### Confirm the API is actually protected

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<API_ID>.execute-api.ap-south-1.amazonaws.com/progress
```

Must be `401`. Same for a junk bearer token.

---

## 4. Rollback

CloudFormation keeps the previous template, but the _content_ lives in S3, so the fastest
rollback is to rebuild from a known-good commit and redeploy:

```bash
git checkout <good-sha> -- src/ && ./scripts/deploy.sh --domain learn.duo1c.in --cert <arn> --google-client-id <id>
```

For an infrastructure mistake, `cdk deploy` a corrected stack — do **not** `cdk destroy`
`LearnDuo1cData`. It is `RETAIN` precisely so a mistaken destroy cannot take user progress
with it, but the safest path is always forward.

---

## 5. Secrets

Rotate the Google client secret (Google Console → Credentials → your OAuth client → add a
new secret), then:

```bash
aws secretsmanager put-secret-value --secret-id learn-duo1c/google-oauth --secret-string '{"clientSecret":"NEW_SECRET"}' --region ap-south-1 --profile default
```

Then redeploy `Auth` so Cognito picks up the new value — CloudFormation resolves the secret
at deploy time, not at request time, so a rotation without a redeploy changes nothing.

The client **id** is public and lives in CDK context and the bundle; only the secret is
sensitive.

---

## 6. Deleting a user's data

Reset in the app is local-first and only propagates if the tab stays open ~2.5 s, and a
second device can resurrect it via the monotone merge (see
[architecture §1](./architecture.md#1-access-model--read-this-first)). To delete for real:

```bash
aws dynamodb delete-item --table-name learn-duo1c-progress --region ap-south-1 --profile default --key '{"pk":{"S":"USER#<sub>"},"sk":{"S":"PROGRESS"}}'
```

Then delete the Cognito user, and have them clear site data in the browser. Note PITR keeps
backups for 35 days.

---

## 7. Cost

Effectively zero at personal scale:

| Service         | Driver                             | Note                                             |
| --------------- | ---------------------------------- | ------------------------------------------------ |
| S3              | ~1 MB of assets                    | cents                                            |
| CloudFront      | PriceClass 200                     | 1 TB/month free tier                             |
| Cognito         | MAU                                | 50 000 free                                      |
| Lambda          | 2 calls per session                | 1 M/month free                                   |
| DynamoDB        | on-demand, one small item per user | pennies                                          |
| Secrets Manager | 1 secret                           | **~$0.40/month — the only guaranteed line item** |
| CloudWatch Logs | 30-day retention                   | negligible                                       |

The dominant risk is not steady-state cost but an accidental loop hammering `PUT /progress`.
The 2.5 s debounce and the store-slice equality check in `src/lib/sync.ts` are what prevent
that; be careful editing them.

---

## 8. DNS reference

Registrar: **GoDaddy** (`ns67/68.domaincontrol.com`). Not Route 53, so records are manual.
Hosts are relative to the zone — no `.duo1c.in` suffix.

| Type  | Host                                      | Value                                                               | Purpose                                                |
| ----- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| CNAME | `_85f4cc119b38df37c15a5b13c137277d.learn` | `_0a6890336b54ac3a76776e9cd1a054ee.jkddzztszm.acm-validations.aws.` | ACM validation — **keep it**, ACM re-checks on renewal |
| CNAME | `learn`                                   | `<DIST_DOMAIN>.cloudfront.net`                                     | The site                                               |

Deleting the validation record breaks automatic certificate renewal.
