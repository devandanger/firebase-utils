#!/bin/bash

# Example: Stream large collection comparison with output directory

./fsdiff.mjs --mode=query \
  --projectA=my-prod-project \
  --collectionA=events \
  --whereA="timestamp>2024-01-01" \
  --saA=./credentials/prod-sa.json \
  --projectB=my-staging-project \
  --collectionB=events \
  --whereB="timestamp>2024-01-01" \
  --saB=./credentials/staging-sa.json \
  --stream \
  --limit=50000 \
  --output-dir=./comparison-results \
  --format=json \
  --verbose