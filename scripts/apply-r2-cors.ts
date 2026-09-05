import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = await import("@aws-sdk/client-s3");

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("Missing one or more R2_* environment variables in .env.local");
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  const corsRule = {
    AllowedOrigins: [
      "http://localhost:3000",
      "https://mahavircard.in",
      "https://www.mahavircard.in",
    ],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["Content-Type"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };

  console.log(`Applying CORS policy to bucket "${bucket}"...`);
  await client.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: [corsRule] },
  }));

  const result = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("Current bucket CORS configuration:");
  console.log(JSON.stringify(result.CORSRules, null, 2));
}

main().catch((error) => {
  console.error("Failed to apply R2 CORS policy:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
