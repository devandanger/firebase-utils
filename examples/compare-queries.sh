#!/bin/bash

# Example: Compare active users between production and staging

./fsdiff.mjs --mode=query \
  --projectA=my-prod-project \
  --collectionA=users \
  --whereA="status==active" \
  --whereA="createdAt>2024-01-01" \
  --saA=./credentials/prod-sa.json \
  --projectB=my-staging-project \
  --collectionB=users \
  --whereB="status==active" \
  --whereB="createdAt>2024-01-01" \
  --saB=./credentials/staging-sa.json \
  --fields="email,role,permissions" \
  --ignore-fields="lastLogin,sessionToken" \
  --key=email \
  --format=pretty