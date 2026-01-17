#!/bin/bash

# Remove firebase-admin
npm uninstall firebase-admin

# Stage all changes
git add -A

# Commit
git commit -m "revert to client-side upload - Firebase Storage rules updated to allow writes"

# Push
git push origin main

echo "✅ Deployed! Wait for Vercel to redeploy, then test the poster upload."
