#!/bin/bash
pnpm build
cd deploy
git rm -r build
scp -r ../build ../package.json ../pnpm-lock.yaml ./
git add .
git commit -m 'deploy'
git push origin main:update
ssh linode "cd sites/jesus; git merge update -m merge; /home/local-first/.local/bin/pm2 restart jesus"