#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FirestoreClient } from '../lib/firestore-client.mjs';
import { normalizeDocument } from '../lib/normalizer.mjs';

program
  .name('fsview')
  .description('View a Firestore document in JSON format')
  .version('1.1.0')
  .option('--project <project>', 'Firebase project ID')
  .option('--path <path>', 'Document path (e.g., users/user123 or users/user123/posts/post456)')
  .option('--sa <path>', 'Service account JSON file path')
  .option('--fields <fields>', 'Comma-separated list of fields to include')
  .option('--ignore-fields <fields>', 'Comma-separated list of fields to ignore')
  .option('--pretty', 'Pretty print JSON output', false);

program.parse();
const options = program.opts();

// Validation
if (!options.project) {
  console.error(chalk.red('Error: --project is required'));
  process.exit(1);
}

if (!options.path) {
  console.error(chalk.red('Error: --path is required'));
  process.exit(1);
}

// Parse field filters
const includeFields = options.fields ? options.fields.split(',').map(f => f.trim()) : null;
const ignoreFields = options.ignoreFields ? options.ignoreFields.split(',').map(f => f.trim()) : [];

async function main() {
  const spinner = ora('Connecting to Firestore...').start();

  try {
    // Initialize Firestore client
    const client = new FirestoreClient({
      projectId: options.project,
      serviceAccountPath: options.sa
    });

    await client.initialize();
    spinner.text = 'Fetching document...';

    // Get the document
    const docRef = client.db.doc(options.path);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      spinner.fail(chalk.red(`Document not found: ${options.path}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green(`Document retrieved: ${options.path}`));

    // Get document data
    const docData = docSnapshot.data();
    const documentWithId = {
      _id: docSnapshot.id,
      _path: docSnapshot.ref.path,
      ...docData
    };

    // Apply field filtering and normalization
    const normalizedDoc = normalizeDocument(documentWithId, {
      includeFields,
      ignoreFields
    });

    // Output JSON
    const jsonOutput = options.pretty
      ? JSON.stringify(normalizedDoc, null, 2)
      : JSON.stringify(normalizedDoc);

    console.log(jsonOutput);

  } catch (error) {
    spinner.fail(chalk.red('Error occurred'));
    if (error.message.includes('Could not load the default credentials')) {
      console.error(chalk.red('Authentication error: Could not load Firebase credentials.'));
      console.error(chalk.yellow('Please ensure you have:'));
      console.error(chalk.yellow('  1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or'));
      console.error(chalk.yellow('  2. Provide --sa flag with service account JSON file, or'));
      console.error(chalk.yellow('  3. Run "gcloud auth application-default login"'));
    } else if (error.code === 'permission-denied') {
      console.error(chalk.red('Permission denied: Check your Firebase security rules and authentication.'));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main().catch(console.error);