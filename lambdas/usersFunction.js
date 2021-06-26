'use strict';

const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');

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

    if (event.resource === '/users') {
        if (method === 'GET') {
            console.debug(`GET ...`);
            const data = await getAllUsers();
            console.debug(`GET data:`, data);

            console.log(`GET will return 200 OK with ${data.Count} users:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            console.debug(`POST ...`);
            console.log(`event.requestContext.authorizer:`, event.requestContext.authorizer); // log de autorização, cognito

            const user = JSON.parse(event.body);

            const result = await createUser(user);

            console.log(`POST will return 201 CREATED for user:`, user);

            return{
                statusCode: 201,
                body: JSON.stringify(user),
            };
        }
    }
    else if (event.resource === '/users/{id}') {
        const userId = event.pathParameters.id;

        if (method === 'GET') {
            console.debug(`GET/${userId} ...`);
            const data = await getUserById(userId);
            console.debug(`GET/${userId} data:`, data);

            if (data && data.Item) {
                console.log(`GET/${userId} will return 200 OK for user:`, data.Item);

                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                console.log(`GET/${userId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User with id ${userId} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.debug(`PUT/${userId} ...`);
            const data = await getUserById(userId);

            if (data && data.Item) {
                const user = JSON.parse(event.body);
                user.id = userId;

                const result = updateUser(userId, user);

                console.debug(`PUT/${userId} data:`, results[0]);

                console.log(`PUT/${userId} will return 200 OK for user:`, user);

                return {
                    statusCode: 200,
                    body: JSON.stringify(user),
                }
            } else {
                console.warn(`PUT/${userId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User with id ${userId} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.debug(`DELETE/${userId} ...`);
            const data = await getUserById(userId);

            if (data && data.Item) {
                await deleteUser(userId);
                console.debug(`DELETE/${userId} data:`, data);

                console.log(`DELETE/${userId} will return 200 OK`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(`User with id ${userId} was deleted`),
                }
            } else {
                console.warn(`DELETE/${userId} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User with id ${userId} not found`),
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

function getAllUsers() {
    try {
        return ddbClient.scan({
            TableName: singleTableDdb,
        })
        .promise();
    } catch (err) {
        return err;
    }
}

function getUserById(userId) {
    try {
        return ddbClient.get({
            TableName: singleTableDdb,
            Key: {
                id: userId
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

function createUser(user) {
    try {
        return ddbClient.put({
            TableName: singleTableDdb,
            Item: {
                pk: `USER#${user.username}`,
                sk: `PROFILE#${user.username}`,
                fullName: user.fullName,
                email: user.email,
                addresses: user.addresses,
            },
        }).promise();
    } catch (err) {
        return err;
    }
}

function updateUser(userId, user) {
    try {
        return ddbClient.update({
            TableName: singleTableDdb,
            Key: {
                id: userId,
            },
            UpdateExpression: 'set productName = :n, code = :c, price = :p, model= :m',
            ExpressionAttributeValues: {
                ':n': user.productName,
                ':c': user.code,
                ':p': user.price,
                ':m': user.model,
            },
            ReturnValues: 'UPDATED_NEW',
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteUser(userId) {
    try {
        return ddbClient.delete({
            TableName: singleTableDdb,
            Key: {
                id: userId,
            }
        }).promise();
    } catch (err) {
        return err;
    }
}

