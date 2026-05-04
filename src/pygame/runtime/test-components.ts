// Test file for the Pygame Component System
import { pygameComponents, getAllComponents, getComponentById } from './pygame-components';

// Test 1: Verify all components are loaded
function testComponentLoading() {
  console.log('Testing Component Loading...');
  console.log(`Total components loaded: ${getAllComponents().length}`);
  
  // Check all components
  pygameComponents.forEach((comp, index) => {
    console.log(`Component ${index + 1}: ${comp.id} - ${comp.name} (${comp.type})`);
  });
  
  return getAllComponents().length >= 12; // We have multiple components
}

// Test 2: Verify component structure
function testComponentStructure() {
  console.log('\nTesting Component Structure...');
  
  const testComponent = getComponentById('sprite');
  if (!testComponent) {
    console.error('Sprite component not found!');
    return false;
  }
  
  // Check required properties
  const hasRequiredProps = 
    testComponent.id === 'sprite' &&
    testComponent.name === 'Sprite' &&
    testComponent.type === 'sprite' &&
    testComponent.properties !== undefined &&
    testComponent.generateCode !== undefined &&
    testComponent.preview !== undefined;
    
  console.log(`Sprite component structure valid: ${hasRequiredProps}`);
  return hasRequiredProps;
}

// Test 3: Test component code generation
function testComponentCodeGeneration() {
  console.log('\nTesting Code Generation...');
  
  const sprite = getComponentById('sprite');
  const ball = getComponentById('ball');
  
  if (!sprite || !ball) {
    console.error('Required components not found!');
    return false;
  }
  
  try {
    const spriteCode = sprite.generateCode(sprite.defaultProperties);
    const ballCode = ball.generateCode(ball.defaultProperties);
    
    const hasExpectedContent = 
      spriteCode.includes('class Sprite') &&
      spriteCode.includes('def __init__') &&
      spriteCode.includes('def update') &&
      ballCode.includes('class Ball') &&
      ballCode.includes('def update');
      
    console.log('Generated component code successfully');
    return hasExpectedContent;
  } catch (error) {
    console.error('Error generating code:', error);
    return false;
  }
}

// Test 4: Test all component types are available
function testAllComponentTypes() {
  console.log('\nTesting All Component Types...');
  
  const componentTypes = [
    'sprite', 'platform', 'ball', 'paddle', 'enemy', 'collectible',
    'background', 'scoreText', 'button', 'particleEffect', 'timer', 'healthBar'
  ];
  
  const missingComponents: string[] = [];
  
  componentTypes.forEach(type => {
    const component = pygameComponents.find(c => c.type === type);
    if (!component) {
      missingComponents.push(type);
    }
  });
  
  if (missingComponents.length > 0) {
    console.error('Missing components:', missingComponents);
    return false;
  }
  
  console.log('All component types are available');
  return true;
}

// Run all tests
export function runComponentTests() {
  console.log('🧪 Running Pygame Component System Tests...\n');
  
  const results = {
    loading: testComponentLoading(),
    structure: testComponentStructure(),
    codeGeneration: testComponentCodeGeneration(),
    allTypes: testAllComponentTypes()
  };
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n📊 Test Results:');
  console.log(`  Component Loading: ${results.loading ? '✅' : '❌'}`);
  console.log(`  Component Structure: ${results.structure ? '✅' : '❌'}`);
  console.log(`  Code Generation: ${results.codeGeneration ? '✅' : '❌'}`);
  console.log(`  All Component Types: ${results.allTypes ? '✅' : '❌'}`);
  console.log(`\n${allPassed ? '✨ All tests passed!' : '❌ Some tests failed'}`);
  
  return allPassed;
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).testPygameComponents = runComponentTests;
  console.log('💡 Pygame Component System loaded. Run testPygameComponents() in console to test.');
}