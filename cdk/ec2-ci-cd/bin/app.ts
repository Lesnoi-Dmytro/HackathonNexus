import dotenv from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { EC2CICDStack } from '../lib/ec2-stack';

const app = new cdk.App();

dotenv.config();

new EC2CICDStack(app, 'EC2HackathonNexusStackCICD', {
  sshPubKeyPath: process.env.SSH_PUB_KEY_PATH ?? '',
});
