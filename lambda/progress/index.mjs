import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

/**
 * Progress read/write for one signed-in user.
 *
 * The whole SyncPayload is stored as a single JSON string on one item.
 * That is deliberate: it is a few KB, it is only ever read and written
 * whole, and one item means every write is atomic with no transaction.
 * The 400 KB item limit is orders of magnitude away even with many
 * subjects — revisit only if a subject ever stores per-attempt history.
 *
 * No npm install: the Node 22 Lambda runtime ships the AWS SDK v3, and
 * using the raw client (rather than lib-dynamodb) keeps it to zero deps.
 */

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Echo the caller's origin only when it is on the allow-list. */
function corsHeaders(event) {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed ?? "null",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Max-Age": "3600",
    Vary: "Origin",
  };
}

function reply(event, statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

export const handler = async (event) => {
  // The JWT authorizer has already verified signature, issuer, audience and
  // expiry — `sub` is trustworthy here and is the only identity we use.
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) return reply(event, 401, { message: "Unauthenticated" });

  const method =
    event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
  const key = { pk: { S: `USER#${sub}` }, sk: { S: "PROGRESS" } };

  try {
    if (method === "GET") {
      const res = await ddb.send(
        new GetItemCommand({ TableName: TABLE, Key: key }),
      );
      if (!res.Item?.data?.S) return reply(event, 404, { message: "No progress" });
      return reply(event, 200, JSON.parse(res.Item.data.S));
    }

    if (method === "PUT") {
      let payload;
      try {
        payload = JSON.parse(event.body ?? "{}");
      } catch {
        return reply(event, 400, { message: "Body is not valid JSON" });
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return reply(event, 400, { message: "Expected a progress object" });
      }

      const serialized = JSON.stringify(payload);
      // Cheap guard against a client bug filling the table with junk.
      if (serialized.length > 300_000) {
        return reply(event, 413, { message: "Progress payload too large" });
      }

      await ddb.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: {
            ...key,
            data: { S: serialized },
            updatedAt: { S: new Date().toISOString() },
          },
        }),
      );
      return reply(event, 204);
    }

    return reply(event, 405, { message: `Unsupported method ${method}` });
  } catch (err) {
    console.error("progress handler failed", err);
    return reply(event, 500, { message: "Internal error" });
  }
};
