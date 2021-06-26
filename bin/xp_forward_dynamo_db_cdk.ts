#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SingleTableDdbCdkStack } from '../lib/singleTableDdb_cdk-stack';
import { UsersFunctionCdkStack } from '../lib/usersFunction_cdk-stack';
import { OrdersFunctionCdkStack } from '../lib/ordersFunction_cdk-stack';
import { ApiStack } from '../lib/api_cdk-stack';

const app = new cdk.App();

const singleTableDdbCdkStack = new SingleTableDdbCdkStack(
  app,
  'XP-SingleTableDdbCdkStack',
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    },
  }
);

const usersFunctionCdkStack = new UsersFunctionCdkStack(
  app,
  'XP-UsersFunctionCdkStack',
  singleTableDdbCdkStack.table,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    },
  }
);
usersFunctionCdkStack.addDependency(singleTableDdbCdkStack);

const ordersFunctionCdkStack = new OrdersFunctionCdkStack(
  app,
  'XP-OrdersFunctionCdkStack',
  singleTableDdbCdkStack.table,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    },
  }
);
ordersFunctionCdkStack.addDependency(singleTableDdbCdkStack);

const apiStack = new ApiStack(
  app,
  'XP-ApiStack',
  usersFunctionCdkStack.handler,
  ordersFunctionCdkStack.handler,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    },
  }
);
apiStack.addDependency(usersFunctionCdkStack);
apiStack.addDependency(ordersFunctionCdkStack);
