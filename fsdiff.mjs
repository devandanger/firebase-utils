#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { FirestoreClient } from './lib/firestore-client.mjs';
import { normalizeValue } from './lib/normalizer.mjs';
import { compareDocuments, compareQueries } from './lib/comparator.mjs';
import { formatDiff } from './lib/formatter.mjs';

program
  .name('fsdiff')
  .description('Compare Firestore data between two projects or environments')
  .version('1.0.0')
  .option('--mode <mode>', 'Comparison mode: doc or query', 'doc')
  .option('--projectA <project>', 'Project ID for source A')
  .option('--projectB <project>', 'Project ID for source B')
  .option('--pathA <path>', 'Document path for source A (doc mode)')
  .option('--pathB <path>', 'Document path for source B (doc mode)')
  .option('--collectionA <collection>', 'Collection path for source A (query mode)')
  .option('--collectionB <collection>', 'Collection path for source B (query mode)')
  .option('--saA <path>', 'Service account JSON file for source A')
  .option('--saB <path>', 'Service account JSON file for source B')
  .option('--whereA <filter>', 'Query filter for source A (repeatable)', collectFilters, [])
  .option('--whereB <filter>', 'Query filter for source B (repeatable)', collectFilters, [])
  .option('--fields <fields>', 'Comma-separated list of fields to compare')
  .option('--ignore-fields <fields>', 'Comma-separated list of fields to ignore')
  .option('--key <key>', 'Field to use as comparison key (default: id)', 'id')
  .option('--format <format>', 'Output format: pretty or json', 'pretty')
  .option('--output-dir <dir>', 'Directory to dump normalized JSON for later diffing')
  .option('--limit <number>', 'Limit number of documents in query mode', parseInt)
  .option('--stream', 'Use streaming for large queries', false)
  .option('--verbose', 'Enable verbose output', false);

function collectFilters(value, previous) {
  return previous.concat([value]);
}

async function main() {
  const options = program.parse(process.argv).opts();
  
  if (options.verbose) {
    console.log(chalk.gray('Options:'), options);
  }

  const spinner = ora('Initializing Firestore clients...').start();

  try {
    if (!options.projectA || !options.projectB) {
      throw new Error('Both projectA and projectB are required');
    }

    const clientA = new FirestoreClient({
      projectId: options.projectA,
      serviceAccountPath: options.saA
    });

    const clientB = new FirestoreClient({
      projectId: options.projectB,
      serviceAccountPath: options.saB
    });

    await clientA.initialize();
    await clientB.initialize();

    spinner.succeed('Firestore clients initialized');

    let result;
    if (options.mode === 'doc') {
      if (!options.pathA || !options.pathB) {
        throw new Error('Both pathA and pathB are required in doc mode');
      }
      
      spinner.start('Fetching documents...');
      result = await compareDocuments(
        clientA,
        clientB,
        options.pathA,
        options.pathB,
        {
          fields: options.fields?.split(','),
          ignoreFields: options.ignoreFields?.split(',')
        }
      );
      spinner.succeed('Documents fetched and compared');
    } else if (options.mode === 'query') {
      if (!options.collectionA || !options.collectionB) {
        throw new Error('Both collectionA and collectionB are required in query mode');
      }

      spinner.start('Executing queries...');
      result = await compareQueries(
        clientA,
        clientB,
        {
          collectionA: options.collectionA,
          collectionB: options.collectionB,
          whereA: options.whereA,
          whereB: options.whereB,
          key: options.key,
          fields: options.fields?.split(','),
          ignoreFields: options.ignoreFields?.split(','),
          limit: options.limit,
          stream: options.stream
        }
      );
      spinner.succeed('Queries executed and compared');
    } else {
      throw new Error(`Invalid mode: ${options.mode}. Use 'doc' or 'query'`);
    }

    if (options.outputDir) {
      await saveNormalizedData(options.outputDir, result.normalizedA, result.normalizedB);
      console.log(chalk.green(`✓ Normalized data saved to ${options.outputDir}`));
    }

    const formatted = formatDiff(result.diff, options.format);
    
    if (options.format === 'json') {
      console.log(JSON.stringify(formatted, null, 2));
    } else {
      console.log(formatted);
    }

    if (result.hasDifferences) {
      console.log(chalk.yellow('\n⚠ Differences found'));
      process.exit(2);
    } else {
      console.log(chalk.green('\n✓ No differences found'));
      process.exit(0);
    }
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function saveNormalizedData(outputDir, dataA, dataB) {
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  await fs.writeFile(
    path.join(outputDir, `sourceA-${timestamp}.json`),
    JSON.stringify(dataA, null, 2)
  );
  
  await fs.writeFile(
    path.join(outputDir, `sourceB-${timestamp}.json`),
    JSON.stringify(dataB, null, 2)
  );
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});