#!/bin/bash
systemctl daemon-reload
systemctl enable hackathon-nexus-api
systemctl start hackathon-nexus-api
