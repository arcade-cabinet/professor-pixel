#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  file: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  estimatedTime: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Smoke Tests',
    file: 'smoke-tests.spec.ts',
    description: 'Basic page loading and critical error detection across all resolutions',
    priority: 'critical',
    estimatedTime: '2-3 minutes'
  },
  {
    name: 'Wizard Flow Tests',
    file: 'wizard-flow-tests.spec.ts',
    description: 'Complete wizard navigation and user flow testing',
    priority: 'critical',
    estimatedTime: '3-4 minutes'
  },
  {
    name: 'WYSIWYG Editor Tests',
    file: 'wysiwyg-editor-tests.spec.ts',
    description: 'Drag-drop functionality and editor interactions',
    priority: 'high',
    estimatedTime: '4-5 minutes'
  },
  {
    name: 'Asset Browser Tests',
    file: 'asset-browser-tests.spec.ts',
    description: 'Asset loading, browsing, and selection functionality',
    priority: 'high',
    estimatedTime: '3-4 minutes'
  },
  {
    name: 'Pixel Animation Tests',
    file: 'pixel-animation-tests.spec.ts',
    description: 'Mascot animations, minimize/restore functionality',
    priority: 'medium',
    estimatedTime: '2-3 minutes'
  }
];

async function createOutputDirectories() {
  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces'
  ];

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
}

async function checkServerHealth() {
  console.log('🔍 Checking server health...');
  
  try {
    const { stdout, stderr } = await execAsync('curl -f http://localhost:5000 > /dev/null 2>&1');
    console.log('✅ Server is running and responsive');
    return true;
  } catch (error) {
    console.log('⚠️ Server not responding, attempting to start...');
    
    try {
      // Try to start the server
      exec('npm run dev', { detached: true } as Parameters<typeof exec>[1]);
      console.log('🚀 Started development server');
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
      return true;
    } catch (startError) {
      console.error('❌ Failed to start server:', startError);
      return false;
    }
  }
}

async function runTestSuite(suite: TestSuite, options: { headless?: boolean; project?: string } = {}) {
  console.log(`\n🧪 Running ${suite.name}`);
  console.log(`📋 ${suite.description}`);
  console.log(`⏱️ Estimated time: ${suite.estimatedTime}`);
  console.log('━'.repeat(60));

  let command = `npx playwright test ${suite.file}`;
  
  if (options.headless === false) {
    command += ' --headed';
  }
  // Headless is default for Playwright, so no flag needed
  
  if (options.project) {
    command += ` --project=${options.project}`;
  }
  
  // Add reporters
  command += ' --reporter=line,html,json';
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, { 
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log('✅ Test suite completed successfully');
    console.log(`⏱️ Duration: ${minutes}m ${seconds}s`);
    
    if (stdout) {
      console.log('📊 Output:', stdout.split('\n').slice(-5).join('\n'));
    }
    
    return { success: true, duration, output: stdout };
    
  } catch (error: any) {
    console.log('❌ Test suite failed');
    console.log('🔍 Error details:');
    
    if (error.stdout) {
      console.log('STDOUT:', error.stdout.split('\n').slice(-10).join('\n'));
    }
    
    if (error.stderr) {
      console.log('STDERR:', error.stderr.split('\n').slice(-10).join('\n'));
    }
    
    return { success: false, duration: 0, error: error.message, output: error.stdout || '' };
  }
}

async function runComprehensiveTests(options: {
  suites?: string[];
  projects?: string[];
  headless?: boolean;
  priority?: 'critical' | 'high' | 'medium';
} = {}) {
  
  console.log('🚀 Starting Comprehensive Playwright Test Suite');
  console.log('═'.repeat(80));
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🖥️ Mode: ${options.headless !== false ? 'Headless' : 'Headed'}`);
  console.log(`🎯 Priority filter: ${options.priority || 'all'}`);
  
  // Create output directories
  await createOutputDirectories();
  
  // Check server health
  const serverReady = await checkServerHealth();
  if (!serverReady) {
    console.error('💥 Cannot proceed without server running');
    process.exit(1);
  }
  
  // Filter test suites
  let suitesToRun = testSuites;
  
  if (options.suites && options.suites.length > 0) {
    suitesToRun = testSuites.filter(suite => 
      options.suites!.some(name => suite.name.toLowerCase().includes(name.toLowerCase()))
    );
  }
  
  if (options.priority) {
    const priorityOrder = { critical: 3, high: 2, medium: 1 };
    const minPriority = priorityOrder[options.priority];
    suitesToRun = suitesToRun.filter(suite => priorityOrder[suite.priority] >= minPriority);
  }
  
  console.log(`\n📋 Test Plan (${suitesToRun.length} suites):`);
  suitesToRun.forEach((suite, index) => {
    console.log(`  ${index + 1}. ${suite.name} [${suite.priority}] - ${suite.estimatedTime}`);
  });
  
  const results: Array<{ suite: string; success: boolean; duration: number; error?: string }> = [];
  let totalDuration = 0;
  
  // Run each test suite
  for (const suite of suitesToRun) {
    const result = await runTestSuite(suite, {
      headless: options.headless,
      project: options.projects?.[0] // Run on first project if specified
    });
    
    results.push({
      suite: suite.name,
      success: result.success,
      duration: result.duration,
      error: result.error
    });
    
    totalDuration += result.duration;
    
    // Brief pause between suites
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate summary report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`⏱️ Total Duration: ${Math.floor(totalDuration / 60000)}m ${Math.floor((totalDuration % 60000) / 1000)}s`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Test Suites:');
    successful.forEach(result => {
      const minutes = Math.floor(result.duration / 60000);
      const seconds = Math.floor((result.duration % 60000) / 1000);
      console.log(`  • ${result.suite} (${minutes}m ${seconds}s)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Test Suites:');
    failed.forEach(result => {
      console.log(`  • ${result.suite}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
  }
  
  // Success criteria
  const successRate = successful.length / results.length;
  if (successRate >= 0.8) {
    console.log('\n🎉 Test suite PASSED (80%+ success rate)');
    return true;
  } else {
    console.log('\n💥 Test suite FAILED (below 80% success rate)');
    return false;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: any = { headless: true };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        options.headless = false;
        break;
      case '--critical':
        options.priority = 'critical';
        break;
      case '--high':
        options.priority = 'high';
        break;
      case '--suite':
        options.suites = options.suites || [];
        options.suites.push(args[++i]);
        break;
      case '--project':
        options.projects = options.projects || [];
        options.projects.push(args[++i]);
        break;
      case '--help':
        console.log(`
Comprehensive Playwright Test Runner

Usage:
  node run-comprehensive-tests.ts [options]

Options:
  --headed              Run tests with browser UI (default: headless)
  --critical           Run only critical priority tests
  --high               Run critical and high priority tests  
  --suite <name>       Run specific test suite (can be used multiple times)
  --project <name>     Run on specific browser project
  --help              Show this help message

Examples:
  node run-comprehensive-tests.ts --critical
  node run-comprehensive-tests.ts --headed --suite "smoke"
  node run-comprehensive-tests.ts --project desktop-chromium
        `);
        process.exit(0);
    }
  }
  
  runComprehensiveTests(options)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

export { runComprehensiveTests, testSuites };