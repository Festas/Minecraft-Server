#!/usr/bin/env node

/**
 * Browser Automation Diagnostics for Plugin Manager
 * 
 * This script uses Puppeteer to:
 * - Load the Plugin Manager page (/console/plugins.html)
 * - Capture console errors, warnings, and JS exceptions
 * - Record network requests (timings, failed requests)
 * - Measure page load, main thread blocks, and FPS
 * - Save diagnostic screenshots
 * - Export all logs and traces for debugging
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  consoleUrl: process.env.CONSOLE_URL || 'http://localhost:3000',
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin',
  outputDir: process.env.OUTPUT_DIR || '/tmp/browser-diagnostics',
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.TIMEOUT || '30000', 10),
  viewport: {
    width: parseInt(process.env.VIEWPORT_WIDTH || '1920', 10),
    height: parseInt(process.env.VIEWPORT_HEIGHT || '1080', 10)
  }
};

// Diagnostic data collectors
const diagnostics = {
  consoleMessages: [],
  networkRequests: [],
  errors: [],
  warnings: [],
  pageMetrics: {},
  screenshots: [],
  traces: []
};

/**
 * Initialize output directory
 */
async function initOutputDir() {
  try {
    await fs.mkdir(config.outputDir, { recursive: true });
    console.log(`✓ Output directory created: ${config.outputDir}`);
  } catch (error) {
    console.error(`✗ Failed to create output directory: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Save diagnostic data to file
 */
async function saveDiagnostics(filename, data) {
  const filepath = path.join(config.outputDir, filename);
  try {
    await fs.writeFile(filepath, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log(`✓ Saved: ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to save ${filename}: ${error.message}`);
  }
}

/**
 * Capture screenshot
 */
async function captureScreenshot(page, name) {
  const filename = `screenshot-${name}-${Date.now()}.png`;
  const filepath = path.join(config.outputDir, filename);
  
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    diagnostics.screenshots.push({ name, filename, timestamp: new Date().toISOString() });
    console.log(`✓ Screenshot captured: ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to capture screenshot ${name}: ${error.message}`);
  }
}

/**
 * Setup page monitoring
 */
function setupPageMonitoring(page) {
  // Console messages
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    
    diagnostics.consoleMessages.push(entry);
    
    if (msg.type() === 'error') {
      diagnostics.errors.push(entry);
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      diagnostics.warnings.push(entry);
      console.log(`[BROWSER WARNING] ${msg.text()}`);
    }
  });

  // Page errors
  page.on('pageerror', error => {
    const entry = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    diagnostics.errors.push(entry);
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Request failures
  page.on('requestfailed', request => {
    const entry = {
      url: request.url(),
      method: request.method(),
      failure: request.failure().errorText,
      timestamp: new Date().toISOString()
    };
    
    diagnostics.networkRequests.push({ ...entry, status: 'failed' });
    console.log(`[REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure().errorText}`);
  });

  // Request finished
  page.on('requestfinished', request => {
    const response = request.response();
    const timing = request.timing();
    
    const entry = {
      url: request.url(),
      method: request.method(),
      status: response ? response.status() : null,
      statusText: response ? response.statusText() : null,
      timing: timing,
      totalTime: timing ? (timing.responseEnd - timing.requestStart) : null,
      timestamp: new Date().toISOString()
    };
    
    diagnostics.networkRequests.push(entry);
    
    if (response && response.status() >= 400) {
      console.log(`[HTTP ERROR] ${request.method()} ${request.url()} - ${response.status()} ${response.statusText()}`);
    }
  });

  // Response errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[RESPONSE ERROR] ${response.url()} - ${response.status()} ${response.statusText()}`);
    }
  });
}

/**
 * Measure page performance
 */
async function measurePerformance(page) {
  try {
    const metrics = await page.metrics();
    const performanceTimings = await page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing;
      const navigation = perf.getEntriesByType('navigation')[0];
      
      return {
        // Navigation Timing API
        navigationStart: timing.navigationStart,
        domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
        loadEventEnd: timing.loadEventEnd,
        domInteractive: timing.domInteractive,
        
        // Computed timings
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
        timeToInteractive: timing.domInteractive - timing.navigationStart,
        
        // Resource Timing
        navigation: navigation ? {
          domComplete: navigation.domComplete,
          domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
          domContentLoadedEventStart: navigation.domContentLoadedEventStart,
          domInteractive: navigation.domInteractive,
          loadEventEnd: navigation.loadEventEnd,
          loadEventStart: navigation.loadEventStart,
          responseEnd: navigation.responseEnd,
          responseStart: navigation.responseStart,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize
        } : null
      };
    });

    diagnostics.pageMetrics = {
      puppeteerMetrics: metrics,
      performanceTimings: performanceTimings,
      timestamp: new Date().toISOString()
    };

    console.log(`✓ Performance metrics captured`);
    console.log(`  - Page load time: ${performanceTimings.pageLoadTime}ms`);
    console.log(`  - DOM ready time: ${performanceTimings.domReadyTime}ms`);
    console.log(`  - Time to interactive: ${performanceTimings.timeToInteractive}ms`);
  } catch (error) {
    console.error(`✗ Failed to measure performance: ${error.message}`);
  }
}

/**
 * Analyze DOM complexity
 */
async function analyzeDOMComplexity(page) {
  try {
    const domStats = await page.evaluate(() => {
      const getAllElements = () => document.querySelectorAll('*');
      const elements = getAllElements();
      
      // Count by tag type
      const tagCounts = {};
      elements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Plugin list specific analysis
      const pluginElements = document.querySelectorAll('.plugin-item, .plugin-card, [data-plugin]');
      const historyElements = document.querySelectorAll('.history-item, [data-history]');
      
      return {
        totalElements: elements.length,
        tagCounts: tagCounts,
        pluginElementCount: pluginElements.length,
        historyElementCount: historyElements.length,
        depth: getMaxDOMDepth(document.body),
        bodyHTML: document.body ? document.body.innerHTML.length : 0
      };
      
      function getMaxDOMDepth(element, depth = 0) {
        if (!element || !element.children || element.children.length === 0) {
          return depth;
        }
        return Math.max(...Array.from(element.children).map(child => 
          getMaxDOMDepth(child, depth + 1)
        ));
      }
    });

    diagnostics.domComplexity = domStats;
    console.log(`✓ DOM complexity analyzed`);
    console.log(`  - Total elements: ${domStats.totalElements}`);
    console.log(`  - Plugin elements: ${domStats.pluginElementCount}`);
    console.log(`  - DOM depth: ${domStats.depth}`);
  } catch (error) {
    console.error(`✗ Failed to analyze DOM: ${error.message}`);
  }
}

/**
 * Login to console
 */
async function login(page) {
  console.log('Attempting login...');
  
  try {
    // Navigate to login page
    await page.goto(`${config.consoleUrl}/console/login.html`, {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });
    
    await captureScreenshot(page, 'login-page');
    
    // Fill login form
    await page.type('#username', config.username);
    await page.type('#password', config.password);
    
    // Click login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeout }),
      page.click('#loginBtn')
    ]);
    
    await captureScreenshot(page, 'after-login');
    
    // Verify login success
    const url = page.url();
    if (url.includes('login.html')) {
      throw new Error('Login failed - still on login page');
    }
    
    console.log('✓ Login successful');
  } catch (error) {
    console.error(`✗ Login failed: ${error.message}`);
    await captureScreenshot(page, 'login-error');
    throw error;
  }
}

/**
 * Load and analyze plugins page
 */
async function analyzePluginsPage(page) {
  console.log('Loading plugins page...');
  
  try {
    // Navigate to plugins page
    const startTime = Date.now();
    await page.goto(`${config.consoleUrl}/console/plugins.html`, {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`✓ Plugins page loaded in ${loadTime}ms`);
    
    await captureScreenshot(page, 'plugins-page-initial');
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);
    
    await captureScreenshot(page, 'plugins-page-settled');
    
    // Measure performance
    await measurePerformance(page);
    
    // Analyze DOM
    await analyzeDOMComplexity(page);
    
    // Check for specific elements
    const elementChecks = await page.evaluate(() => {
      return {
        hasPluginsList: !!document.getElementById('pluginsList'),
        hasHistoryList: !!document.getElementById('historyList'),
        hasInstallBtn: !!document.getElementById('installBtn'),
        hasRefreshBtn: !!document.getElementById('refreshPluginsBtn'),
        pluginCount: document.getElementById('pluginCount')?.textContent || 'N/A',
        loadingVisible: document.querySelector('.loading')?.offsetParent !== null
      };
    });
    
    diagnostics.elementChecks = elementChecks;
    console.log(`✓ Element checks completed`);
    console.log(`  - Plugin count: ${elementChecks.pluginCount}`);
    console.log(`  - Loading visible: ${elementChecks.loadingVisible}`);
    
    // Simulate user interaction - click refresh
    console.log('Simulating refresh click...');
    await page.click('#refreshPluginsBtn');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'after-refresh');
    
  } catch (error) {
    console.error(`✗ Failed to analyze plugins page: ${error.message}`);
    await captureScreenshot(page, 'plugins-page-error');
    throw error;
  }
}

/**
 * Generate summary report
 */
async function generateSummary() {
  const summary = [];
  
  summary.push('='.repeat(80));
  summary.push('BROWSER DIAGNOSTICS SUMMARY');
  summary.push('='.repeat(80));
  summary.push('');
  summary.push(`Timestamp: ${new Date().toISOString()}`);
  summary.push(`Console URL: ${config.consoleUrl}`);
  summary.push('');
  
  summary.push('ERRORS & WARNINGS');
  summary.push('-'.repeat(80));
  summary.push(`Total Errors: ${diagnostics.errors.length}`);
  summary.push(`Total Warnings: ${diagnostics.warnings.length}`);
  summary.push(`Total Console Messages: ${diagnostics.consoleMessages.length}`);
  summary.push('');
  
  if (diagnostics.errors.length > 0) {
    summary.push('Critical Errors:');
    diagnostics.errors.slice(0, 10).forEach((err, i) => {
      summary.push(`  ${i + 1}. ${err.text || err.message}`);
    });
    summary.push('');
  }
  
  summary.push('NETWORK REQUESTS');
  summary.push('-'.repeat(80));
  const failedRequests = diagnostics.networkRequests.filter(r => r.status === 'failed' || (r.status && r.status >= 400));
  summary.push(`Total Requests: ${diagnostics.networkRequests.length}`);
  summary.push(`Failed Requests: ${failedRequests.length}`);
  summary.push('');
  
  if (failedRequests.length > 0) {
    summary.push('Failed Requests:');
    failedRequests.forEach((req, i) => {
      summary.push(`  ${i + 1}. ${req.method} ${req.url} - ${req.status || req.failure}`);
    });
    summary.push('');
  }
  
  summary.push('PERFORMANCE METRICS');
  summary.push('-'.repeat(80));
  if (diagnostics.pageMetrics.performanceTimings) {
    const pt = diagnostics.pageMetrics.performanceTimings;
    summary.push(`Page Load Time: ${pt.pageLoadTime}ms`);
    summary.push(`DOM Ready Time: ${pt.domReadyTime}ms`);
    summary.push(`Time to Interactive: ${pt.timeToInteractive}ms`);
  }
  summary.push('');
  
  summary.push('DOM COMPLEXITY');
  summary.push('-'.repeat(80));
  if (diagnostics.domComplexity) {
    summary.push(`Total Elements: ${diagnostics.domComplexity.totalElements}`);
    summary.push(`Plugin Elements: ${diagnostics.domComplexity.pluginElementCount}`);
    summary.push(`History Elements: ${diagnostics.domComplexity.historyElementCount}`);
    summary.push(`DOM Depth: ${diagnostics.domComplexity.depth}`);
  }
  summary.push('');
  
  summary.push('SCREENSHOTS');
  summary.push('-'.repeat(80));
  diagnostics.screenshots.forEach((screenshot, i) => {
    summary.push(`  ${i + 1}. ${screenshot.name} - ${screenshot.filename}`);
  });
  summary.push('');
  
  summary.push('DIAGNOSTIC FILES');
  summary.push('-'.repeat(80));
  summary.push('  - SUMMARY.txt (this file)');
  summary.push('  - console-messages.json (all console logs)');
  summary.push('  - network-requests.json (all network activity)');
  summary.push('  - errors.json (all errors)');
  summary.push('  - performance-metrics.json (timing data)');
  summary.push('  - dom-complexity.json (DOM structure analysis)');
  summary.push('  - screenshots/*.png (visual snapshots)');
  summary.push('');
  
  summary.push('ROOT CAUSE ANALYSIS GUIDE');
  summary.push('-'.repeat(80));
  summary.push('1. Check errors.json for JavaScript exceptions');
  summary.push('2. Review network-requests.json for failed API calls');
  summary.push('3. Examine performance-metrics.json for slow load times');
  summary.push('4. Check screenshots for visual rendering issues');
  summary.push('5. Review console-messages.json for debug information');
  summary.push('');
  
  return summary.join('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Browser Automation Diagnostics');
  console.log('='.repeat(80));
  console.log('');
  
  await initOutputDir();
  
  let browser;
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('✓ Browser launched');
    
    // Create page
    const page = await browser.newPage();
    await page.setViewport(config.viewport);
    
    // Setup monitoring
    setupPageMonitoring(page);
    
    // Login
    await login(page);
    
    // Analyze plugins page
    await analyzePluginsPage(page);
    
    // Save all diagnostic data
    console.log('');
    console.log('Saving diagnostic data...');
    await saveDiagnostics('console-messages.json', diagnostics.consoleMessages);
    await saveDiagnostics('network-requests.json', diagnostics.networkRequests);
    await saveDiagnostics('errors.json', diagnostics.errors);
    await saveDiagnostics('warnings.json', diagnostics.warnings);
    await saveDiagnostics('performance-metrics.json', diagnostics.pageMetrics);
    await saveDiagnostics('dom-complexity.json', diagnostics.domComplexity);
    await saveDiagnostics('element-checks.json', diagnostics.elementChecks);
    
    // Generate and save summary
    const summary = await generateSummary();
    await saveDiagnostics('SUMMARY.txt', summary);
    
    console.log('');
    console.log('='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80));
    
    console.log('');
    console.log(`✓ All diagnostics saved to: ${config.outputDir}`);
    console.log('');
    
    process.exit(diagnostics.errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('');
    console.error('✗ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
