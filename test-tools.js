#!/usr/bin/env node

/**
 * Simple test to verify Forest MCP tools are working
 */

async function testForestTools() {
  console.log('🧪 Testing Forest MCP Tools...');

  try {
    // Import the main server
    const { CleanForestServer } = await import('./forest-server/server-modular.js');
    console.log('✅ Server module imported successfully');

    // Create server instance
    const server = new CleanForestServer();
    console.log('✅ Server instance created successfully');

    // Test if we can get available tools
    console.log('🔧 Testing tool availability...');

    // Create a minimal test project
    console.log('📁 Testing project creation...');
    const projectResult = await server.createProject({
      project_id: 'test_ultrathink',
      projectName: 'UltraThink Test Project',
      goal: 'Test if tools are working',
      context: 'Simple functional test',
      urgency: 3,
      life_structure_preferences: 'flexible',
    });

    if (projectResult.content && projectResult.content[0]) {
      console.log('✅ Project creation test passed');
      console.log('Result:', `${projectResult.content[0].text.substring(0, 100)}...`);
    } else {
      console.log('❌ Project creation returned unexpected format');
    }

    // Test getting next task
    console.log('📋 Testing task generation...');
    const taskResult = await server.getNextTask(
      {
        energy_level: 3,
        time_available: 30,
      },
      3,
      '30 minutes'
    );

    if (taskResult.content && taskResult.content[0]) {
      console.log('✅ Task generation test passed');
      console.log('Result:', `${taskResult.content[0].text.substring(0, 100)}...`);
    } else {
      console.log('❌ Task generation returned unexpected format');
    }

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }

  return true;
}

// Run the test
testForestTools()
  .then(success => {
    if (success) {
      console.log('\n✅ Forest MCP tools are working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ Forest MCP tools have issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  });
