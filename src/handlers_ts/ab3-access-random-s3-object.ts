import { Context, Handler, ScheduledEvent } from "aws-lambda";
import { Credentials, S3, STS } from "aws-sdk";

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const roles = [
    "ab3-app-1",
    "ab3-app-2",
    "ab3-app-2",
    "ab3-app-3",
    "ab3-app-3",
    "ab3-app-3",
];

const buckets = [
    "jeff-ab3-test-1",
    "jeff-ab3-test-1",
    "jeff-ab3-test-2",
    "jeff-ab3-test-2",
    "jeff-ab3-test-2",
];

const accessRandomS3Object: Handler<ScheduledEvent> = async (event: ScheduledEvent, context: Context) => {
    console.info(JSON.stringify(event));

    const randomRole = roles[getRandomInt(0, roles.length - 1)];
    console.log("Randomly selected role: " + randomRole);

    const sts = new STS();
    const assumeRoleResponse = await sts.assumeRole({ RoleArn: "arn:aws:iam::163053802001:role/" + randomRole, RoleSessionName: "accessRandomS3Object" }).promise();
    if (!assumeRoleResponse.Credentials) { throw Error("Could not assume role " + randomRole + "."); }

    const s3 = new S3({ credentials: new Credentials(assumeRoleResponse.Credentials.AccessKeyId, assumeRoleResponse.Credentials.SecretAccessKey, assumeRoleResponse.Credentials.SessionToken) });

    // console.log("Listing buckets...");
    // const listBucketsResponse = await s3.listBuckets().promise();
    // if (!listBucketsResponse.Buckets) { throw Error("Could not list buckets."); }
    // console.log("Found " + listBucketsResponse.Buckets.length + " buckets.");

    const randomBucket = buckets[getRandomInt(0, buckets.length - 1)];
    console.log("Randomly selected bucket: " + randomBucket);

    console.log("Listing objects in bucket...");
    const listObjectsV2Response = await s3.listObjectsV2({ Bucket: randomBucket }).promise();
    if (!listObjectsV2Response.Contents) { throw Error("Could not list objects."); }
    console.log("Found " + listObjectsV2Response.Contents.length + " objects.");

    const randomAmount = getRandomInt(1, 4);
    console.log("Reading " + randomAmount + " objects.");
    for (let i = 0; i < randomAmount; i++) {

        let randomObject: S3.Object;

        do {
            const r = getRandomInt(0, listObjectsV2Response.Contents.length - 1);
            randomObject = listObjectsV2Response.Contents[r];
            console.log("Randomly selected object: " + randomObject.Key);
        } while (!randomObject?.Key)

        console.log("Getting object...");
        const getObjectResponse = await s3.getObject({ Bucket: randomBucket, Key: randomObject.Key }).promise();
        if (getObjectResponse.$response.error) { throw Error("Could not get object.") };

        console.log("Object size: " + getObjectResponse.ContentLength);
    }
};

export const handler = accessRandomS3Object;