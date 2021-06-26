import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export class OrdersFunctionCdkStack extends cdk.Stack {
  readonly handler: lambdaNodeJS.NodejsFunction;

  constructor(
    scope: cdk.Construct,
    id: string,
    singleTableDdb: dynamodb.Table,
    props?: cdk.StackProps) {
    super(scope, id, props);

    this.handler = new lambdaNodeJS.NodejsFunction(this, 'XP_OrdersFunction', {
      functionName: 'XP_OrdersFunction',
      entry: 'lambdas/ordersFunction.js',
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

    singleTableDdb.grantReadWriteData(this.handler); // dar permissão ao lambda para ler/escrever na tabela
  }
}
