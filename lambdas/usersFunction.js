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

            console.log(`GET will return 200 OK with ${data.Count} users:`, data.Items);
            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            }
        }
        else if (method === 'POST') {
            console.debug(`POST ...`);

            const user = JSON.parse(event.body);

            const result = await createUser(user);

            console.log(`POST will return 201 CREATED for user:`, user);

            return{
                statusCode: 201,
                body: JSON.stringify(user),
            };
        }
    }
    else if (event.resource === '/users/{username}') {
        const username = event.pathParameters.username;

        if (method === 'GET') {
            console.debug(`GET/${username} ...`);
            const data = await getUser(username);

            if (data && data.Item) {
                console.log(`GET/${username} will return 200 OK for user:`, data.Item);

                return {
                    body: JSON.stringify(data.Item),
                }
            } else {
                console.log(`GET/${username} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
                }
            }
        }
        else if (method === 'PUT') {
            console.debug(`PUT/${username} ...`);
            const data = await getUser(username);

            if (data && data.Item) {
                const user = JSON.parse(event.body);
                user.username = username;

                const result = await updateUser(user);

                console.log(`PUT/${username} will return 200 OK for user:`, user);

                return {
                    statusCode: 200,
                    body: JSON.stringify(user),
                }
            } else {
                console.warn(`PUT/${username} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
                }
            }
        }
        else if (method === 'DELETE') {
            console.debug(`DELETE/${username} ...`);
            const data = await getUser(username);

            if (data && data.Item) {
                await deleteUser(username);

                console.log(`DELETE/${username} will return 200 OK`);

                return {
                    statusCode: 200,
                    body: JSON.stringify(`User ${username} was deleted`),
                }
            } else {
                console.warn(`DELETE/${username} will return 404 NOT FOUND`);

                return {
                    statusCode: 404,
                    body: JSON.stringify(`User ${username} not found`),
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
        const params = {
            TableName: singleTableDdb,
            KeyConditionExpression: 'pk = :user',
            ExpressionAttributeValues: {
                ':user': `USER#`
            },
        };
        return ddbClient.query(params).promise();
    } catch (err) {
        return err;
    }
}

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

function createUser(user) {
    try {
        return ddbClient.put({
            TableName: singleTableDdb,
            Item: {
                pk: `USER#`,
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

function updateUser(user) {
    try {
        return ddbClient.update({
            TableName: singleTableDdb,
            Key: {
                pk: `USER#`,
                sk: `PROFILE#${user.username}`,
            },
            UpdateExpression: 'set fullName = :fn, email = :e, addresses= :a',
            ExpressionAttributeValues: {
                ':fn': user.fullName,
                ':e': user.email,
                ':a': user.addresses
            },
            ReturnValues: 'UPDATED_NEW',
        }).promise();
    } catch (err) {
        return err;
    }
}

function deleteUser(username) {
    try {
        return ddbClient.delete({
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

