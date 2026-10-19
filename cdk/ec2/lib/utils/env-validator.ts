import fs from "fs";

export interface EC2DeploymentProps {
  sshPubKeyPath: string;
}

export function envValidator(props: EC2DeploymentProps) {
  if (!props.sshPubKeyPath) {
    throw new Error("Public SSH key path is required");
  }
  if (!fs.existsSync(props.sshPubKeyPath)) {
    throw new Error("Public SSH key path is invalid");
  }
}
