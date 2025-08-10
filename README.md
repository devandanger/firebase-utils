# fsdiff - Firestore Data Comparison Tool

A powerful CLI tool for comparing Firestore data between two projects or environments without using the Firebase console UI.

## Features

- **Document Comparison**: Compare single documents between projects
- **Query Comparison**: Compare query results with filtering and field selection
- **Multiple Authentication Methods**: Service account JSON, GOOGLE_APPLICATION_CREDENTIALS, or gcloud ADC
- **Firestore Type Normalization**: Handles Timestamp, GeoPoint, DocumentReference, and Bytes types
- **Streaming Support**: Efficiently handle large queries
- **Flexible Output**: Pretty-printed or JSON format
- **Field Management**: Select specific fields or ignore fields during comparison
- **CI/CD Ready**: Exit codes indicate success (0), differences (2), or errors (1)

## Installation

```bash
npm install
npm link  # Optional: to use globally as 'fsdiff'
```

## Usage

### Document Comparison

Compare a single document between two projects:

```bash
./fsdiff.mjs --mode=doc \
  --projectA=my-prod --pathA="users/abc123" --saA=sa-prod.json \
  --projectB=my-dev  --pathB="users/abc123" --saB=sa-dev.json
```

### Query Comparison

Compare query results between projects:

```bash
./fsdiff.mjs --mode=query \
  --projectA=my-prod --collectionA=users --whereA="active==true" \
  --projectB=my-dev  --collectionB=users --whereB="active==true" \
  --fields="role,status" --format=pretty
```

### With Multiple Filters

```bash
./fsdiff.mjs --mode=query \
  --projectA=my-prod --collectionA=orders \
  --whereA="status==pending" --whereA="amount>100" \
  --projectB=my-dev --collectionB=orders \
  --whereB="status==pending" --whereB="amount>100" \
  --key=orderId
```

### Streaming Large Queries

```bash
./fsdiff.mjs --mode=query \
  --projectA=my-prod --collectionA=events \
  --projectB=my-dev --collectionB=events \
  --stream --limit=10000
```

### Save Normalized Output

```bash
./fsdiff.mjs --mode=query \
  --projectA=my-prod --collectionA=products \
  --projectB=my-dev --collectionB=products \
  --output-dir=./diffs --format=json
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode` | Comparison mode: `doc` or `query` | `doc` |
| `--projectA/B` | Project ID for source A/B | Required |
| `--pathA/B` | Document path (doc mode) | Required in doc mode |
| `--collectionA/B` | Collection path (query mode) | Required in query mode |
| `--saA/B` | Service account JSON file path | Optional |
| `--whereA/B` | Query filters (repeatable) | Optional |
| `--fields` | Comma-separated fields to compare | All fields |
| `--ignore-fields` | Comma-separated fields to ignore | None |
| `--key` | Field for document matching | `id` |
| `--format` | Output format: `pretty` or `json` | `pretty` |
| `--output-dir` | Directory for normalized JSON output | Optional |
| `--limit` | Maximum documents to compare | No limit |
| `--stream` | Use streaming for large queries | `false` |
| `--verbose` | Enable verbose output | `false` |

## Authentication

The tool supports three authentication methods (in order of precedence):

1. **Service Account File**: Use `--saA` and `--saB` options
2. **Environment Variable**: Set `GOOGLE_APPLICATION_CREDENTIALS`
3. **Application Default Credentials**: Uses gcloud auth credentials

## Filter Syntax

Filters use the format: `field operator value`

Supported operators:
- `==`, `!=`, `>`, `>=`, `<`, `<=`
- `in`, `not-in`, `array-contains`, `array-contains-any`

Value types:
- Strings: `name=="John"` or `name==John`
- Numbers: `age>25`
- Booleans: `active==true`
- Null: `deleted==null`
- Arrays: `status==["pending","active"]`

## Exit Codes

- `0`: No differences found
- `1`: Error occurred
- `2`: Differences found

## Examples

### Compare User Profiles

```bash
./fsdiff.mjs --mode=doc \
  --projectA=prod --pathA="users/user123/profile" \
  --projectB=staging --pathB="users/user123/profile" \
  --ignore-fields="lastSeen,updatedAt"
```

### Compare Active Orders

```bash
./fsdiff.mjs --mode=query \
  --projectA=prod --collectionA=orders \
  --whereA="status==active" --whereA="created>2024-01-01" \
  --projectB=staging --collectionB=orders \
  --whereB="status==active" --whereB="created>2024-01-01" \
  --key=orderId --fields="total,items,customer"
```

### CI/CD Pipeline Integration

```bash
#!/bin/bash
./fsdiff.mjs --mode=query \
  --projectA=$PROD_PROJECT --collectionA=config \
  --projectB=$STAGING_PROJECT --collectionB=config \
  --format=json > config-diff.json

if [ $? -eq 2 ]; then
  echo "Configuration differences detected!"
  cat config-diff.json
  exit 1
fi
```

## Development

### Project Structure

```
firebase-utils/
├── fsdiff.mjs              # Main CLI entry point
├── lib/
│   ├── firestore-client.mjs   # Firestore connection and query handling
│   ├── normalizer.mjs         # Type normalization and field filtering
│   ├── comparator.mjs         # Document and query comparison logic
│   ├── differ.mjs             # Diff calculation engine
│   └── formatter.mjs          # Output formatting (pretty/JSON)
├── examples/
│   ├── compare-docs.sh        # Document comparison example
│   ├── compare-queries.sh     # Query comparison example
│   └── streaming-comparison.sh # Large dataset streaming example
├── package.json
├── README.md
└── .env.example
```

### Architecture Highlights

- **Streaming Support**: Efficiently handles large queries without loading all data into memory
- **Parallel Processing**: Fetches data from both sources simultaneously
- **Type Normalization**: Consistent handling of Firestore special types
- **Modular Design**: Separated concerns for authentication, normalization, comparison, and formatting

## License

MIT