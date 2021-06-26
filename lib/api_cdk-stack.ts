import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cwlogs from '@aws-cdk/aws-logs';

export class ApiStack extends cdk.Stack {

    constructor(
        scope: cdk.Construct,
        id: string,
        usersHandler: lambdaNodeJS.NodejsFunction,
        ordersHandler: lambdaNodeJS.NodejsFunction,
        props?: cdk.StackProps) {
        super(scope, id, props);

        const logGroup = new cwlogs.LogGroup(this, 'XP_ApiLog');

        const api = new apigateway.RestApi(this, 'XP_Api', {
        restApiName: 'XP Forward DynamoDB CDK Service',
        description: 'XP Forward DynamoDB CDK Service',
        deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                caller: true,
                httpMethod: true,
                ip: true,
                protocol: true,
                requestTime: true,
                resourcePath: true,
                responseLength: true,
                status: true,
                user: true,
                }),
            },
        });

        const usersFunctionIntegration = new apigateway.LambdaIntegration(usersHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        const usersResource = api.root.addResource('users'); // add a resource in /
        usersResource.addMethod('GET', usersFunctionIntegration);
        usersResource.addMethod('POST', usersFunctionIntegration);

        const userResource = usersResource.addResource('{id}'); // add a resorce /products/{id}
        userResource.addMethod('GET', usersFunctionIntegration);
        userResource.addMethod('PUT', usersFunctionIntegration);
        userResource.addMethod('DELETE', usersFunctionIntegration);


        const ordersFunctionIntegration = new apigateway.LambdaIntegration(ordersHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        const ordersResource = api.root.addResource('orders'); // add a resource in /
        ordersResource.addMethod('GET', ordersFunctionIntegration);
        ordersResource.addMethod('POST', ordersFunctionIntegration);

        const orderResource = ordersResource.addResource('{id}'); // add a resorce /products/{id}
        orderResource.addMethod('GET', ordersFunctionIntegration);
        orderResource.addMethod('PUT', ordersFunctionIntegration);
        orderResource.addMethod('DELETE', ordersFunctionIntegration);
    }
}