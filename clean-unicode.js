const fs = require('fs');
const path = require('path');

// Function to detect non-ASCII characters
function containsNonASCII(text) {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(text);
}

// Function to clean non-ASCII characters
function cleanNonASCII(text) {
  return text
    // Replace smart quotes
    .replace(/[""]/g, '"')
    // Replace smart apostrophes
    .replace(/['']/g, "'")
    // Replace em dash
    .replace(/—/g, '-')
    // Replace ellipsis
    .replace(/…/g, '...')
    // Remove invisible Unicode characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove zero-width spaces
    .replace(/[\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, '')
    // Trim whitespace
    .trim();
}

// Recursive function to scan directory
function scanDirectory(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, files);
    } else if (item.endsWith('.jsx') || item.endsWith('.js') || item.endsWith('.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        const problematicLines = [];
        
        lines.forEach((line, index) => {
          if (containsNonASCII(line)) {
            problematicLines.push(index + 1);
          }
        });
        
        if (problematicLines.length > 0) {
          files.push({
            file: fullPath,
            lines: problematicLines,
            preview: problematicLines.slice(0, 3).map(i => {
              const lineNum = problematicLines[i];
              const line = lines[lineNum - 1];
              return `Line ${lineNum}: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`;
            }).join('\n')
          });
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error.message);
      }
    }
  }
  
  return files;
}

// Main execution
function main() {
  const srcDir = path.join(__dirname, 'src');
  console.log('Scanning for non-ASCII characters in:', srcDir);
  
  const problematicFiles = scanDirectory(srcDir);
  
  if (problematicFiles.length === 0) {
    console.log('✅ No non-ASCII characters found in project files.');
    return;
  }
  
  console.log('\n❌ Found non-ASCII characters in:');
  problematicFiles.forEach(file => {
    console.log(`\n📁 ${file.file}`);
    console.log('Problematic lines:', file.lines.join(', '));
    if (file.preview) {
      console.log('Preview:');
      console.log(file.preview);
    }
  });
  
  console.log('\n💡 To fix these issues:');
  console.log('1. Replace smart quotes ("") with regular quotes (")');
  console.log('2. Replace smart apostrophes (\') with regular apostrophes (\')');
  console.log('3. Replace em dashes (—) with regular dashes (-)');
  console.log('4. Replace ellipsis (…) with three dots (...)');
  console.log('5. Remove invisible Unicode characters');
  console.log('\n⚠️  Non-ASCII characters can cause JavaScript parsing errors!');
}

if (require.main === module) {
  main();
}
