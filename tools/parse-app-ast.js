const fs = require('fs');
const path = require('path');

function parseAppFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== Parsing ${filePath} ===`);
  console.log('File size:', content.length, 'bytes');
  
  // Check for BOM
  const bom = content.charCodeAt(0);
  if (bom === 0xEF) {
    console.log('BOM detected at byte 0');
  }
  
  // Show problematic areas
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.length > 200) {
      console.log(`Line ${index + 1}: ${line.substring(0, 100)}... (truncated)`);
    } else {
      console.log(`Line ${index + 1}: ${line}`);
    }
  });
  
  // Check for non-ASCII characters in critical areas
  const criticalLines = [115, 116, 117, 118, 119, 120, 121, 122, 126]; // Around export statement
  
  console.log('\n=== Critical Lines Analysis ===');
  criticalLines.forEach((lineNum) => {
    const line = lines[lineNum - 1];
    if (line) {
      const bytes = [];
      for (let i = 0; i < line.length; i++) {
        const charCode = line.charCodeAt(i);
        if (charCode < 0 || charCode > 127) {
          bytes.push(`0x${charCode.toString(16).padStart(2, '0')}`);
        }
      }
      if (bytes.length > 0) {
        console.log(`Line ${lineNum}: NON-ASCII chars: ${bytes.join(' ')}`);
      }
    }
  });
  
  return {
    hasBOM: bom === 0xEF,
    problematicLines: criticalLines,
    content: content
  };
}

if (require.main === module) {
  const filePath = path.join(__dirname, 'src/App.jsx');
  const analysis = parseAppFile(filePath);
  
  console.log('\n=== ANALYSIS RESULTS ===');
  console.log('Has BOM:', analysis.hasBOM);
  console.log('Problematic lines:', analysis.problematicLines);
  
  if (analysis.problematicLines.length > 0) {
    console.log('\n❌ SYNTAX ISSUES DETECTED');
    process.exit(1);
  } else {
    console.log('\n✅ File appears syntactically correct');
  }
}
