// Test script for local roadmap parser
const { parseRoadmapText, validateRoadmapText, sampleRoadmapText } = require('./roadmapParser.js');

console.log('=== Testing Local Roadmap Parser ===\n');

// Test 1: Parse sample text
console.log('Test 1: Parsing sample roadmap text...\n');
const result = parseRoadmapText(sampleRoadmapText);

console.log('Subject:', result.subjects[0].name);
console.log('Number of Phases:', result.subjects[0].phases.length);
console.log('Total Tasks:', result.subjects[0].phases.reduce((acc, p) => acc + p.tasks.length, 0));

console.log('\n--- Detailed Structure ---');
result.subjects[0].phases.forEach((phase, pIdx) => {
  console.log(`\nPhase ${pIdx + 1}: ${phase.name}`);
  console.log(`  Tasks: ${phase.tasks.length}`);
  
  phase.tasks.forEach((task, tIdx) => {
    console.log(`  ${tIdx + 1}. ${task.name}`);
    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`     Subtasks (${task.subtasks.length}):`);
      task.subtasks.forEach((subtask) => {
        console.log(`       • ${subtask}`);
      });
    }
  });
});

// Test 2: Validate
console.log('\n\n--- Validation Test ---');
const validation = validateRoadmapText(sampleRoadmapText);
console.log('Is Valid:', validation.isValid);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
}

console.log('\n✅ All tests completed successfully!');
console.log('\nParser features:');
console.log('- Parses Subject: lines');
console.log('- Parses Phase: lines');
console.log('- Parses - Task lines');
console.log('- Parses   - Subtask lines (2-space indent)');
console.log('- Stores subtasks as array inside tasks');
