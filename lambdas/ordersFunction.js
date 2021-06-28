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

    const username = event.pathParameters.username;

    const data = await getUser(username);
    if (!data || !data.Item) {
        console.warn(`Username ${username} not found! `);
        return {
            statusCode: 404,
            body: JSON.stringify(`User ${username} not found`),
        }
    }
    console.debug(`Username ${username} found, continuing ... `);

    if (event.resource === '/orders/{username}') {
        if (method === 'GET') {
            console.debug(`GET /orders/${username} ...`);
            const data = await getAllUserOrders(username);

            console.log(`GET /orders/${username} will return 200 OK with ${data.Count} orders:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            console.debug(`POST /orders/${username} ...`);

            const order = JSON.parse(event.body);
            order.username = username;
            order.id = uuid.v4();

            const result = await createOrder(order);

            console.log(`POST /orders/${username} will return 201 CREATED for order:`, order);

            return{
                statusCode: 201,
                body: JSON.stringify(order),
            };
        }
    } else if (event.resource === '/orders/{username}/status/{status}') {
        const status = event.pathParameters.status;
        if (method === 'GET') {
            console.debug(`GET /orders/${username}/status/${status} ...`);
            const data = await getAllUserOrdersByStatus(username, status);

            console.log(`GET /orders/${username}/status/${status} will return 200 OK with ${data.Count} orders:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
    } else if (event.resource === '/orders/{username}/{id}') {
        const orderId = event.pathParameters.id;

        if (method === 'GET') {
            console.debug(`GET /orders/${username}/${orderId} ...`);
            const data = await getUserOrderById(username, orderId);

            if (data && data.Item) {
                console.log(`GET /orders/${username}/${orderId} will return 200 OK for order:`, data.Item);

                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                console.log(`GET /orders/${username}/${orderId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.debug(`PUT /orders/${username}/${orderId} ...`);
            const data = await getUserOrderById(username, orderId);

            if (data && data.Item) {
                const order = JSON.parse(event.body);
                order.username = username;
                order.id = orderId;

                const result = await updateOrder(order);

                console.log(`PUT /orders/${username}/${orderId} will return 200 OK for order:`, order);

                return {
                    statusCode: 200,
                    body: JSON.stringify(order),
                }
            } else {
                console.warn(`PUT /orders/${username}/${orderId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order with id ${orderId} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.debug(`DELETE /orders/${username}/${orderId} ...`);
            const data = await getUserOrderById(orderId);

            if (data && data.Item) {
                await deleteOrder(orderId);

                console.log(`DELETE /orders/${username}/${orderId} will return 200 OK`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(`Order with id ${orderId} was deleted`),
                }
            } else {
                console.warn(`DELETE /orders/${username}/${orderId} will return 404 NOT FOUND`);

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

function getUser(username) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${username}`,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function getAllUserOrders(username) {
    try {
        const params = {
            TableName: singleTableDdb,
            KeyConditionExpression: 'pk = :username',
            ExpressionAttributeValues: {
                ':username': `ORDER#${username}`
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

function getAllUserOrdersByStatus(username, status) {
    try {
        const params = {
            TableName: singleTableDdb,
            IndexName: 'orderStatusIdx',
            KeyConditionExpression: 'orderStatus = :s AND pk = :u',
            ExpressionAttributeValues: {
                ':s': status,
                ':u': `ORDER#${username}`,
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

function getUserOrderById(username, orderId) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${username}`,
                sk: `ORDER#${orderId}`,
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
                orderStatus: order.orderStatus,
                items: order.items,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateOrder(order) {
    try {
        return ddbClient.update({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${order.username}`,
                sk: `ORDER#${order.id}`,
            },
            UpdateExpression: 'set orderStatus = :s, items = :i',
            ExpressionAttributeValues: {
                ':s': order.orderStatus,
                ':i': order.items,
            },
            ReturnValues: 'UPDATED_NEW',
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteOrder(username, orderId) {
    try {
        return ddbClient.delete({
            TableName: singleTableDdb,
            Key: {
                pk: `ORDER#${username}`,
                sk: `ORDER#${orderId}`,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

