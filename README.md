# ab3

Created using AWS SAM and CloudFormation

## Required Tools

NodeJS: https://nodejs.org/en/
AWS SAM CLI: https://aws.amazon.com/serverless/sam/

## Deploying the stack

1. Deploy `ab3.yaml` into your AWS account.
2. Log into Kibana (using endpoint in stack output). You will need to sign up with and confirm your email.
3. In Kibana, go to Management > Stack Management > Saved Objects. Import `kibana.ndjson` to setup the visualizations and dashboard.
2. Run `npm i` to install NodeJS packages.
3. Run `npm run build` to build the Lambda handlers.
4. Run `sam deploy` to deploy the SAM stack. This will require AWS credentials with permission to create IAM roles and policies, S3 buckets, Lambda functions and permissions, and Events rules. 
