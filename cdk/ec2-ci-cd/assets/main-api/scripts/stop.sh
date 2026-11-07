#!/bin/bash
systemctl stop hackathon-nexus-api || true
rm -rf /home/ec2-user/app
