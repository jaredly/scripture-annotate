#!/bin/bash
pnpm build
cd deploy
git rm -r build
scp -r ../build ../package.json ../pnpm-lock.yaml ./
git add .
git commit -m 'deploy'