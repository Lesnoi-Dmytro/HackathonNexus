import dotenv from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { EC2Stack } from '../lib/ec2-stack';

const app = new cdk.App();

dotenv.config();

new EC2Stack(app, 'EC2HackathonNexusStack', {
  sshPubKeyPath: process.env.SSH_PUB_KEY_PATH ?? '',
});
