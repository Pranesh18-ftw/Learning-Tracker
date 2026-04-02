// Test script for Gemini Machine Learning generation
const { generateRoadmap } = require('./geminiService.js');

async function testMachineLearning() {
  console.log('🧪 Testing Gemini API Integration for Machine Learning...\n');
  
  try {
    const result = await generateRoadmap('', 'Machine Learning');
    
    console.log('✅ SUCCESS! Generated Roadmap:\n');
    console.log('='.repeat(60));
    console.log('Subject:', result.name);
    console.log('Total Phases:', result.phases.length);
    console.log('Total Tasks:', result.phases.reduce((acc, p) => acc + p.tasks.length, 0));
    console.log('='.repeat(60));
    
    result.phases.forEach((phase, pIdx) => {
      console.log(`\n📚 Phase ${pIdx + 1}: ${phase.name}`);
      phase.tasks.forEach((task, tIdx) => {
        console.log(`   ${tIdx + 1}. ${task.name}`);
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((st) => {
            console.log(`      • ${st}`);
          });
        }
      });
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Test completed! The AI generated a full roadmap.');
    console.log('💡 To use the real Gemini API, enter your API key in the Learning Plan Setup.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMachineLearning();
