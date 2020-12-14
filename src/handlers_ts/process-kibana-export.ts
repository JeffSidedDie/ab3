import { Context, Handler, S3Event } from "aws-lambda";
import { S3 } from "aws-sdk";
import { createInterface } from "readline";

const s3ActionMap: { [eventName: string]: string } = {
    "ListObjects": "ListBucket"
};

const processKibanaExport: Handler<S3Event> = async (event: S3Event, context: Context) => {
    console.info(JSON.stringify(event));

    const accountId = context.invokedFunctionArn.split(":")[4];
    const s3 = new S3();

    for (const r of event.Records) {
        const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, " "));
        const getObjectStream = s3.getObject({ Bucket: r.s3.bucket.name, Key: key }).createReadStream();
        const rl = createInterface({
            input: getObjectStream,
            terminal: false,
        });

        const allBucketActions = new Map<string, Map<string, string[]>>();
        for await (const line of rl) {
            //console.log(line);
            if (line.indexOf("Bucket,Role,Event,Count") > 0) { //skip header row if present
                console.log("Skipping header row...");
                continue;
            }

            const parts = line.split(",");
            const bucket = parts[0].replace(/"/g, '');
            const role = parts[1].replace(/"/g, '');
            const event = parts[2];
            const count = parseInt(parts[3]);

            if (!allBucketActions.has(bucket)) {
                allBucketActions.set(bucket, new Map<string, string[]>());
            }
            const currentBucketActions = allBucketActions.get(bucket);

            if (!currentBucketActions?.has(role)) {
                currentBucketActions?.set(role, []);
            }
            const currentRoleActions = currentBucketActions?.get(role);

            currentRoleActions?.push(event);
        }

        let bucketPolicies = "";

        for (const bucketName of allBucketActions.keys()) {
            console.log("Processing bucket: " + bucketName);

            const bucketMap = allBucketActions.get(bucketName);
            if (!bucketMap) { continue; }

            let policyDoc = `{
                "Version": "2012-10-17",
                "Statement": [`;
            const statements: string[] = [];

            for (const roleName of bucketMap.keys()) {
                const actions = bucketMap.get(roleName);
                if (!actions) { continue; }
                //console.log(`Bucket: ${bucketName}, Role: ${roleName}, Actions: ${JSON.stringify(actions)}`);

                const s = `{
                    "Action": [
                        ${actions.map(a => s3ActionMap[a] || a).map(a => `"s3:${a}"`).join(",")}
                    ],
                    "Effect": "Allow",
                    "Resource": [
                        "arn:aws:s3:::${bucketName}",
                        "arn:aws:s3:::${bucketName}/*"
                    ],
                    "Principal": {
                        "AWS": [
                            "arn:aws:iam::${accountId}:role/${roleName}"
                        ]
                    }
                }`;
                statements.push(s);
            }

            policyDoc += statements.join(",");
            policyDoc += `]
                }`;

            bucketPolicies += `${bucketName}\n\n`;
            bucketPolicies += `${policyDoc}\n\n`;

            const putObjectResponse = await s3.putObject({
                Bucket: r.s3.bucket.name,
                Key: `${key}.result`,
                Body: bucketPolicies,
            }).promise();
            console.log(putObjectResponse);
        }
    }
};

export const handler = processKibanaExport;