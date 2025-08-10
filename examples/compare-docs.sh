#!/bin/bash

# Example: Compare a single user document between production and staging

./fsdiff.mjs --mode=doc \
  --projectA=my-prod-project \
  --pathA="users/user123" \
  --saA=./credentials/prod-sa.json \
  --projectB=my-staging-project \
  --pathB="users/user123" \
  --saB=./credentials/staging-sa.json \
  --format=pretty