#!/bin/bash

# Example: Side-by-side comparison of user documents

echo "=== Side-by-Side Document Comparison ==="
./fsdiff.mjs --mode=doc \
  --projectA=blazebite-dev \
  --pathA="users/user123" \
  --projectB=blazebite-dev \
  --pathB="users/user456" \
  --format=side-by-side \
  --ignore-fields="lastLogin,sessionToken"

echo -e "\n=== Side-by-Side Query Comparison ==="
./fsdiff.mjs --mode=query \
  --projectA=blazebite-dev \
  --collectionA=products \
  --projectB=blazebite-dev \
  --collectionB=products_v2 \
  --whereA="category==electronics" \
  --whereB="category==electronics" \
  --format=side-by-side \
  --limit=5