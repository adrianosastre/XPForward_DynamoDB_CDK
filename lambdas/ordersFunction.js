'use strict';

const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const uuid = require('uuid');

// código a ser executado na inicialização do lambda:

const xRay = AWSXRay.captureAWS(require('aws-sdk')); // tudo o que acontecer dentro do SDK o xray captura e monitora: gera traces

const singleTableDdb = process.env.SINGLE_TABLE_DDB;
const awsRegion = process.env.AWS_REGION;


AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient(); // cliente que se conecta no dynamo

// a partir daqui faz parte da invocação do lambda:
exports.handler = async function(event, context) {
    console.debug('event:', event);
    console.debug('context:', context);
    const method = event.httpMethod;

    const apiGwRequestId = event.requestContext.requestId; // request id da api gtw (chamou o lambda)
    const lambdaRequestId = context.awsRequestId; // request id do lambda

    console.debug(`API Gateway Request Id: ${apiGwRequestId} , Lambda Request Id: ${lambdaRequestId}`);

    if (event.resource === '/orders') {
        if (method === 'GET') {
            console.debug(`GET ...`);
            const data = await getAllOrders();
            console.debug(`GET data:`, data);

            console.log(`GET will return 200 OK with ${data.Count} orders:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            console.debug(`POST ...`);
            console.log(`event.requestContext.authorizer:`, event.requestContext.authorizer); // log de autorização, cognito

            const order = JSON.parse(event.body);
            order.id = uuid.v4();

            const result = await createOrder(order);

            console.log(`POST will return 201 CREATED for order:`, order);

            return{
                statusCode: 201,
                body: JSON.stringify(order),
            };
        }
    }
    else if (event.resource === '/orders/{id}') {
        const orderId = event.pathParameters.id;

        if (method === 'GET') {
            console.debug(`GET/${orderId} ...`);
            const data = await getOrderById(orderId);
            console.debug(`GET/${orderId} data:`, data);

            if (data && data.Item) {
                console.log(`GET/${orderId} will return 200 OK for order:`, data.Item);

                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                console.log(`GET/${orderId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.debug(`PUT/${orderId} ...`);
            const data = await getOrderById(orderId);

            if (data && data.Item) {
                const order = JSON.parse(event.body);
                order.id = orderId;

                const result = updateOrder(orderId, order);

                console.debug(`PUT/${orderId} data:`, results[0]);

                console.log(`PUT/${orderId} will return 200 OK for order:`, order);

                return {
                    statusCode: 200,
                    body: JSON.stringify(order),
                }
            } else {
                console.warn(`PUT/${orderId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.debug(`DELETE/${orderId} ...`);
            const data = await getOrderById(orderId);

            if (data && data.Item) {
                await deleteOrder(orderId);
                console.debug(`DELETE/${orderId} data:`, data);

                console.log(`DELETE/${orderId} will return 200 OK`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(`Order with id ${orderId} was deleted`),
                }
            } else {
                console.warn(`DELETE/${orderId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }
        }
    }

    return {
        statusCode: 400,
        headers: {},
        body: JSON.stringify('Bad Request!'),
    };
};

function getAllOrders() {
    try {
        return ddbClient.scan({
            TableName: singleTableDdb,
        })
        .promise();
    } catch (err) {
        return err;
    }
}

function getOrderById(orderId) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                id: orderId
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function createOrder(order) {
    try {
        return ddbClient.put({
            TableName: singleTableDdb,
            Item: {
                pk: `ORDER#${order.username}`,
                sk: `ORDER#${order.id}`,
                status: order.status,
                items: order.items,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateOrder(orderId, order) {
    try {
        return ddbClient.update({
            TableName: singleTableDdb,
            Key: {
                id: orderId,
            },
            UpdateExpression: 'set productName = :n, code = :c, price = :p, model= :m',
            ExpressionAttributeValues: {
                ':n': order.productName,
                ':c': order.code,
                ':p': order.price,
                ':m': order.model,
            },
            ReturnValues: 'UPDATED_NEW',
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteOrder(orderId) {
    try {
        return ddbClient.delete({
            TableName: singleTableDdb,
            Key: {
                id: orderId,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

