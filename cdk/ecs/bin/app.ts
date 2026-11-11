import dotenv from "dotenv";
import * as cdk from 'aws-cdk-lib';
import { CDKStack } from '../lib/ecs-stack';

const app = new cdk.App();

dotenv.config();

new CDKStack(app, 'ECSHackathonNexusStack', {
  sshPubKeyPath: process.env.SSH_PUB_KEY_PATH ?? '',
  initialSetup: process.env.INITIAL_SETUP === "true",
});
