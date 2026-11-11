import fs from "fs";

export interface EC2CICDDeploymentProps {
  sshPubKeyPath: string;
  initialSetup: boolean;
}

export function envValidator(props: EC2CICDDeploymentProps) {
  if (!props.sshPubKeyPath) {
    throw new Error("Public SSH key path is required");
  }
  if (!fs.existsSync(props.sshPubKeyPath)) {
    throw new Error("Public SSH key path is invalid");
  }
}
