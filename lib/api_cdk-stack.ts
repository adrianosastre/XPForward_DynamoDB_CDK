import * as cdk from '@aws-cdk/core';
import * as lambdaNodeJS from '@aws-cdk/aws-lambda-nodejs';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cwlogs from '@aws-cdk/aws-logs';

/*
  @adrianosastre
  This is the class responsible to create the CloudFormation stack that contains the api gateway resource responsible to 
  configure the /users and /orders endpoints.
  It is integrated to the respective lambda functions.
*/

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

        // USUÁRIOS:
        // Listar todos os usuários
        // Listar perfil (detalhes) de um usuário
        // Adicionar usuário
        // Editar usuário
        // Deletar usuário

        const usersResource = api.root.addResource('users');
        usersResource.addMethod('GET', usersFunctionIntegration);
        usersResource.addMethod('POST', usersFunctionIntegration);

        const userResource = usersResource.addResource('{username}');
        userResource.addMethod('GET', usersFunctionIntegration);
        userResource.addMethod('PUT', usersFunctionIntegration);
        userResource.addMethod('DELETE', usersFunctionIntegration);

        const ordersFunctionIntegration = new apigateway.LambdaIntegration(ordersHandler, {
            requestTemplates: {
                'application/json': '{"statusCode: 200"}',
            }
        });

        // PEDIDOS:
        // Listar todos os pedidos de um usuário *
        // Listar pedidos de um usuário por status *
        // Adicionar pedido de um usuário *
        // Editar pedido de um usuário *
        // Deletar pedido de um usuário
        // Buscar itens de um pedido de um usuário *

        const ordersResource = api.root.addResource('orders');
        const ordersUserResource = ordersResource.addResource('{username}'); // /orders/{username}
        ordersUserResource.addMethod('GET', ordersFunctionIntegration); // todos os pedidos de um usuário
        ordersUserResource.addMethod('POST', ordersFunctionIntegration); // adicionar pedido de um usuário

        const ordersUserStatusResource = ordersUserResource.addResource('status').addResource('{status}'); // /orders/{username}/status/{status}
        ordersUserStatusResource.addMethod('GET', ordersFunctionIntegration); // pedidos de um usuário por status

        const orderResource = ordersUserResource.addResource('{id}'); // /orders/{username}/id/{id}
        orderResource.addMethod('GET', ordersFunctionIntegration); // itens de um pedido de um usuário
        orderResource.addMethod('PUT', ordersFunctionIntegration); // editar pedido de um usuário
        orderResource.addMethod('DELETE', ordersFunctionIntegration); // deletar pedido de um usuário
    }
}