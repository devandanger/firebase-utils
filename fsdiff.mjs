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
  .option('--format <format>', 'Output format: pretty, side-by-side, or json', 'pretty')
  .option('--output-dir <dir>', 'Directory to dump normalized JSON for later diffing')
  .option('--output-format <format>', 'Format for output files: json, yaml, or text', 'json')
  .option('--separate-files', 'Create separate files per document/field for granular diffing', false)
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
      await saveNormalizedData(
        options.outputDir, 
        result.normalizedA, 
        result.normalizedB,
        {
          format: options.outputFormat,
          separateFiles: options.separateFiles,
          mode: options.mode,
          pathA: options.pathA,
          pathB: options.pathB,
          collectionA: options.collectionA,
          collectionB: options.collectionB
        }
      );
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

async function saveNormalizedData(outputDir, dataA, dataB, options = {}) {
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const { format = 'json', separateFiles = false, mode, pathA, pathB, collectionA, collectionB } = options;
  
  if (separateFiles && Array.isArray(dataA) && Array.isArray(dataB)) {
    await saveSeparateFiles(outputDir, dataA, dataB, { format, timestamp, mode });
  } else {
    await saveCombinedFiles(outputDir, dataA, dataB, { format, timestamp, mode, pathA, pathB, collectionA, collectionB });
  }
  
  // Create a summary file for easy external diffing
  await createDiffSummary(outputDir, dataA, dataB, { format, timestamp, mode });
}

async function saveCombinedFiles(outputDir, dataA, dataB, options) {
  const { format, timestamp, mode, pathA, pathB, collectionA, collectionB } = options;
  const ext = getFileExtension(format);
  
  const metadata = {
    mode,
    timestamp: new Date().toISOString(),
    sourceA: mode === 'doc' ? pathA : collectionA,
    sourceB: mode === 'doc' ? pathB : collectionB,
    countA: Array.isArray(dataA) ? dataA.length : 1,
    countB: Array.isArray(dataB) ? dataB.length : 1
  };
  
  const contentA = formatContent(dataA, format, metadata);
  const contentB = formatContent(dataB, format, metadata);
  
  await Promise.all([
    fs.writeFile(path.join(outputDir, `sourceA-${timestamp}.${ext}`), contentA),
    fs.writeFile(path.join(outputDir, `sourceB-${timestamp}.${ext}`), contentB),
    fs.writeFile(path.join(outputDir, `metadata-${timestamp}.json`), JSON.stringify(metadata, null, 2))
  ]);
}

async function saveSeparateFiles(outputDir, dataA, dataB, options) {
  const { format, timestamp } = options;
  const ext = getFileExtension(format);
  
  // Create subdirectories
  const dirA = path.join(outputDir, 'sourceA', timestamp);
  const dirB = path.join(outputDir, 'sourceB', timestamp);
  
  await Promise.all([
    fs.mkdir(dirA, { recursive: true }),
    fs.mkdir(dirB, { recursive: true })
  ]);
  
  // Save each document as a separate file
  const savePromises = [];
  
  for (const [index, doc] of dataA.entries()) {
    const filename = doc._id ? `${doc._id}.${ext}` : `doc-${index}.${ext}`;
    const content = formatContent(doc, format);
    savePromises.push(fs.writeFile(path.join(dirA, filename), content));
  }
  
  for (const [index, doc] of dataB.entries()) {
    const filename = doc._id ? `${doc._id}.${ext}` : `doc-${index}.${ext}`;
    const content = formatContent(doc, format);
    savePromises.push(fs.writeFile(path.join(dirB, filename), content));
  }
  
  await Promise.all(savePromises);
}

async function createDiffSummary(outputDir, dataA, dataB, options) {
  const { timestamp } = options;
  
  const summary = {
    timestamp: new Date().toISOString(),
    comparison: {
      sourceA: {
        type: Array.isArray(dataA) ? 'collection' : 'document',
        count: Array.isArray(dataA) ? dataA.length : 1
      },
      sourceB: {
        type: Array.isArray(dataB) ? 'collection' : 'document', 
        count: Array.isArray(dataB) ? dataB.length : 1
      }
    },
    files: {
      sourceA: `sourceA-${timestamp}.${getFileExtension(options.format)}`,
      sourceB: `sourceB-${timestamp}.${getFileExtension(options.format)}`,
      metadata: `metadata-${timestamp}.json`
    },
    externalDiffCommands: {
      vscode: `code --diff "${path.join(outputDir, `sourceA-${timestamp}.${getFileExtension(options.format)}`)}" "${path.join(outputDir, `sourceB-${timestamp}.${getFileExtension(options.format)}`)}"`,
      meld: `meld "${path.join(outputDir, `sourceA-${timestamp}.${getFileExtension(options.format)}`)}" "${path.join(outputDir, `sourceB-${timestamp}.${getFileExtension(options.format)}`)}"`,
      vimdiff: `vimdiff "${path.join(outputDir, `sourceA-${timestamp}.${getFileExtension(options.format)}`)}" "${path.join(outputDir, `sourceB-${timestamp}.${getFileExtension(options.format)}`)}"`,
      diff: `diff -u "${path.join(outputDir, `sourceA-${timestamp}.${getFileExtension(options.format)}`)}" "${path.join(outputDir, `sourceB-${timestamp}.${getFileExtension(options.format)}`)}"`,
      directory: options.separateFiles ? `meld "${path.join(outputDir, 'sourceA', timestamp)}" "${path.join(outputDir, 'sourceB', timestamp)}"` : null
    }
  };
  
  await fs.writeFile(
    path.join(outputDir, `diff-summary-${timestamp}.json`),
    JSON.stringify(summary, null, 2)
  );
}

function formatContent(data, format, metadata = {}) {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'yaml':
      // For YAML, we'll use a simple format since we don't want to add yaml dependency
      return `# Generated by fsdiff at ${new Date().toISOString()}\n# Metadata: ${JSON.stringify(metadata)}\n\n${jsonToYaml(data)}`;
    
    case 'text':
      return `# Generated by fsdiff at ${new Date().toISOString()}\n# Metadata: ${JSON.stringify(metadata, null, 2)}\n\n${jsonToText(data)}`;
    
    default:
      return JSON.stringify(data, null, 2);
  }
}

function getFileExtension(format) {
  switch (format) {
    case 'yaml': return 'yml';
    case 'text': return 'txt';
    case 'json':
    default: return 'json';
  }
}

function jsonToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    let result = '\n';
    for (const item of obj) {
      result += `${spaces}- ${jsonToYaml(item, indent + 1)}\n`;
    }
    return result.slice(0, -1); // Remove last newline
  }
  
  if (typeof obj === 'object') {
    if (Object.keys(obj).length === 0) return '{}';
    let result = '\n';
    for (const [key, value] of Object.entries(obj)) {
      const formattedValue = jsonToYaml(value, indent + 1);
      if (formattedValue.startsWith('\n')) {
        result += `${spaces}${key}:${formattedValue}\n`;
      } else {
        result += `${spaces}${key}: ${formattedValue}\n`;
      }
    }
    return result.slice(0, -1); // Remove last newline
  }
  
  return String(obj);
}

function jsonToText(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    let result = '[\n';
    for (let i = 0; i < obj.length; i++) {
      result += `${spaces}  [${i}] ${jsonToText(obj[i], indent + 1)}\n`;
    }
    result += `${spaces}]`;
    return result;
  }
  
  if (typeof obj === 'object') {
    if (Object.keys(obj).length === 0) return '{}';
    let result = '{\n';
    for (const [key, value] of Object.entries(obj)) {
      result += `${spaces}  ${key}: ${jsonToText(value, indent + 1)}\n`;
    }
    result += `${spaces}}`;
    return result;
  }
  
  return String(obj);
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});