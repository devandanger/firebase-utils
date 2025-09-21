# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-01-15

### Added
- Initial release of fsdiff CLI tool
- Document comparison mode (`--mode=doc`)
- Query comparison mode (`--mode=query`)
- Multiple authentication methods (Service Account, ENV vars, gcloud ADC)
- Firestore type normalization (Timestamp, GeoPoint, DocumentReference, Bytes)
- Streaming support for large queries (`--stream`)
- Multiple output formats: pretty, side-by-side, JSON
- Export functionality for external diff tools (`--output-dir`)
- Field selection and filtering (`--fields`, `--ignore-fields`)
- Custom comparison keys (`--key`)
- CI/CD friendly exit codes
- Comprehensive examples and documentation

### Features
- Compare single documents between projects
- Compare query results with advanced filtering
- Support for multiple where clauses
- Efficient memory handling with streaming
- Export data in JSON, YAML, or text formats
- Create separate files per document for granular diffing
- Ready-to-run commands for external diff tools

[1.0.0]: https://github.com/yourusername/firebase-utils/releases/tag/v1.0.0