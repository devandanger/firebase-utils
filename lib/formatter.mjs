import chalk from 'chalk';
import { diffJson } from 'diff';

export function formatDiff(diff, format = 'pretty') {
  if (format === 'json') {
    return formatJsonOutput(diff);
  }
  
  if (Array.isArray(diff)) {
    return formatDocumentDiff(diff);
  }
  
  return formatQueryDiff(diff);
}

function formatDocumentDiff(differences) {
  if (differences.length === 0) {
    return chalk.green('✓ Documents are identical');
  }

  let output = chalk.yellow('\n⚠ Document differences found:\n\n');

  for (const diff of differences) {
    output += formatSingleDiff(diff) + '\n';
  }

  return output;
}

function formatQueryDiff(diff) {
  const { added, removed, changed } = diff;
  let output = '';

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return chalk.green('✓ Query results are identical');
  }

  output += chalk.yellow('\n⚠ Query differences found:\n');

  if (removed.length > 0) {
    output += chalk.red(`\n━━━ Removed (${removed.length} documents) ━━━\n`);
    for (const item of removed) {
      output += chalk.red(`- [${item.key}]`) + '\n';
      output += formatValue(item.document, '  ', chalk.red) + '\n';
    }
  }

  if (added.length > 0) {
    output += chalk.green(`\n━━━ Added (${added.length} documents) ━━━\n`);
    for (const item of added) {
      output += chalk.green(`+ [${item.key}]`) + '\n';
      output += formatValue(item.document, '  ', chalk.green) + '\n';
    }
  }

  if (changed.length > 0) {
    output += chalk.blue(`\n━━━ Changed (${changed.length} documents) ━━━\n`);
    for (const item of changed) {
      output += chalk.blue(`~ [${item.key}]`) + '\n';
      for (const diff of item.diff) {
        output += '  ' + formatSingleDiff(diff) + '\n';
      }
      output += '\n';
    }
  }

  return output;
}

function formatSingleDiff(diff) {
  const path = chalk.gray(diff.path || 'root');

  switch (diff.type) {
    case 'added':
      return `${chalk.green('+')} ${path}: ${formatValue(diff.value, '', chalk.green)}`;
    
    case 'removed':
      return `${chalk.red('-')} ${path}: ${formatValue(diff.value, '', chalk.red)}`;
    
    case 'changed':
      return `${chalk.blue('~')} ${path}:\n` +
             `    ${chalk.red('- ' + formatValue(diff.oldValue))}\n` +
             `    ${chalk.green('+ ' + formatValue(diff.newValue))}`;
    
    default:
      return '';
  }
}

function formatValue(value, indent = '', colorFn = null) {
  if (value === null) return colorFn ? colorFn('null') : 'null';
  if (value === undefined) return colorFn ? colorFn('undefined') : 'undefined';

  if (typeof value === 'string') {
    const formatted = JSON.stringify(value);
    return colorFn ? colorFn(formatted) : formatted;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const formatted = String(value);
    return colorFn ? colorFn(formatted) : formatted;
  }

  if (value._type) {
    const formatted = formatSpecialType(value);
    return colorFn ? colorFn(formatted) : formatted;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return colorFn ? colorFn('[]') : '[]';
    }
    
    let result = '[\n';
    for (let i = 0; i < value.length; i++) {
      result += indent + '  ' + formatValue(value[i], indent + '  ', colorFn);
      if (i < value.length - 1) result += ',';
      result += '\n';
    }
    result += indent + ']';
    return result;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return colorFn ? colorFn('{}') : '{}';
    }

    let result = '{\n';
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const formattedKey = colorFn ? colorFn(`"${key}"`) : `"${key}"`;
      result += `${indent}  ${formattedKey}: ${formatValue(value[key], indent + '  ', colorFn)}`;
      if (i < keys.length - 1) result += ',';
      result += '\n';
    }
    result += indent + '}';
    return result;
  }

  return String(value);
}

function formatSpecialType(value) {
  switch (value._type) {
    case 'Timestamp':
      return `Timestamp(${value.iso})`;
    
    case 'GeoPoint':
      return `GeoPoint(${value.latitude}, ${value.longitude})`;
    
    case 'DocumentReference':
      return `DocumentReference(${value.path})`;
    
    case 'Bytes':
      return `Bytes(${value.length} bytes)`;
    
    case 'Date':
      return `Date(${value.iso})`;
    
    default:
      return JSON.stringify(value);
  }
}

function formatJsonOutput(diff) {
  if (Array.isArray(diff)) {
    return {
      type: 'document',
      hasDifferences: diff.length > 0,
      differences: diff
    };
  }

  return {
    type: 'query',
    hasDifferences: diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0,
    summary: {
      added: diff.added.length,
      removed: diff.removed.length,
      changed: diff.changed.length
    },
    differences: diff
  };
}

export function formatDetailedDiff(objA, objB) {
  const diff = diffJson(objA || {}, objB || {}, {
    ignoreWhitespace: false
  });

  let output = '';
  
  for (const part of diff) {
    if (part.added) {
      output += chalk.green(part.value);
    } else if (part.removed) {
      output += chalk.red(part.value);
    } else {
      output += chalk.gray(part.value);
    }
  }

  return output;
}