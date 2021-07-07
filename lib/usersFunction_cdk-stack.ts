import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

/*
  @adrianosastre
  This is the class responsible to create the CloudFormation stack that contains the lambda resource responsible to handle the users.
  It is integrated to the dynamoDB table.
*/
export class UsersFunctionCdkStack extends cdk.Stack {
  readonly handler: lambdaNodeJS.NodejsFunction;

  constructor(
    scope: cdk.Construct,
    id: string,
    singleTableDdb: dynamodb.Table,
    props?: cdk.StackProps) {
    super(scope, id, props);

    this.handler = new lambdaNodeJS.NodejsFunction(this, 'XP_UsersFunction', {
      functionName: 'XP_UsersFunction',
      entry: 'lambdas/usersFunction.js',
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: false,
      },
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SINGLE_TABLE_DDB: singleTableDdb.tableName,
      },
    });

    singleTableDdb.grantReadWriteData(this.handler);

  }
}
