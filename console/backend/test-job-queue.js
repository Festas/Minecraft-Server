#!/usr/bin/env node

/**
 * Test script for Plugin Manager V2 Job Queue System
 */

const jobQueue = require('./services/jobQueue');

async function testJobQueue() {
    console.log('=== Testing Job Queue System ===\n');
    
    try {
        // Initialize
        console.log('1. Initializing job queue...');
        await jobQueue.initializeJobsFile();
        console.log('✓ Job queue initialized\n');
        
        // Create a job
        console.log('2. Creating test install job...');
        const job1 = await jobQueue.createJob({
            action: 'install',
            url: 'https://example.com/test-plugin.jar',
            name: 'TestPlugin',
            options: {}
        });
        console.log('✓ Job created:', job1.id);
        console.log('  Status:', job1.status);
        console.log('  Action:', job1.action);
        console.log('  Created:', job1.createdAt);
        console.log('');
        
        // Add log entry
        console.log('3. Adding log entry to job...');
        await jobQueue.addJobLog(job1.id, 'Test log message');
        console.log('✓ Log added\n');
        
        // Update job status
        console.log('4. Updating job status to running...');
        await jobQueue.updateJob(job1.id, { status: 'running' });
        console.log('✓ Job status updated\n');
        
        // Get job
        console.log('5. Retrieving job...');
        const retrieved = await jobQueue.getJob(job1.id);
        console.log('✓ Job retrieved:');
        console.log('  ID:', retrieved.id);
        console.log('  Status:', retrieved.status);
        console.log('  Logs:', retrieved.logs.length);
        console.log('');
        
        // Create another job
        console.log('6. Creating second job...');
        const job2 = await jobQueue.createJob({
            action: 'enable',
            name: 'TestPlugin'
        });
        console.log('✓ Second job created:', job2.id);
        console.log('');
        
        // List all jobs
        console.log('7. Listing all jobs...');
        const allJobs = await jobQueue.getJobs();
        console.log('✓ Found', allJobs.length, 'jobs');
        allJobs.forEach(j => {
            console.log(`  - ${j.id}: ${j.action} [${j.status}]`);
        });
        console.log('');
        
        // Complete first job
        console.log('8. Completing first job...');
        await jobQueue.updateJob(job1.id, {
            status: 'completed',
            result: { pluginName: 'TestPlugin', version: '1.0.0' }
        });
        await jobQueue.addJobLog(job1.id, 'Job completed successfully');
        console.log('✓ Job completed\n');
        
        // Cancel second job
        console.log('9. Cancelling second job...');
        await jobQueue.cancelJob(job2.id);
        console.log('✓ Job cancelled\n');
        
        // Get final state
        console.log('10. Getting final state...');
        const finalJobs = await jobQueue.getJobs();
        console.log('✓ Final job states:');
        finalJobs.forEach(j => {
            console.log(`  - ${j.id}: ${j.status}`);
            if (j.logs && j.logs.length > 0) {
                console.log(`    Logs: ${j.logs.length} entries`);
            }
            if (j.result) {
                console.log(`    Result:`, JSON.stringify(j.result));
            }
        });
        console.log('');
        
        console.log('=== All Tests Passed! ===\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
testJobQueue().then(() => {
    console.log('Test script completed successfully');
    process.exit(0);
}).catch(err => {
    console.error('Test script failed:', err);
    process.exit(1);
});
