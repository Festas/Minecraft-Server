/**
 * Frontend Debug & Diagnostics Module
 * 
 * Provides comprehensive debugging capabilities for the Plugin Manager:
 * - Global error trapping
 * - Performance monitoring
 * - DOM complexity analysis
 * - Network request tracking
 * - Manual debug dump functionality
 */

(function() {
    'use strict';
    
    // Diagnostics data store
    window.PluginManagerDiagnostics = {
        errors: [],
        warnings: [],
        networkRequests: [],
        performanceMarks: {},
        domSnapshots: [],
        consoleHistory: [],
        startTime: Date.now(),
        enabled: true
    };
    
    const diagnostics = window.PluginManagerDiagnostics;
    
    /**
     * Initialize global error handlers
     */
    function initializeErrorHandlers() {
        // Capture unhandled errors
        window.addEventListener('error', function(event) {
            const errorInfo = {
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? {
                    name: event.error.name,
                    message: event.error.message,
                    stack: event.error.stack
                } : null,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            };
            
            diagnostics.errors.push(errorInfo);
            console.error('[DIAGNOSTICS] Uncaught error:', errorInfo);
            
            // Don't prevent default error handling
            return false;
        }, true);
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            const errorInfo = {
                type: 'unhandledRejection',
                reason: event.reason,
                promise: event.promise,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            };
            
            diagnostics.errors.push(errorInfo);
            console.error('[DIAGNOSTICS] Unhandled promise rejection:', errorInfo);
        });
        
        console.log('[DIAGNOSTICS] Global error handlers initialized');
    }
    
    /**
     * Intercept console methods to capture logs
     */
    function interceptConsole() {
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };
        
        console.log = function(...args) {
            diagnostics.consoleHistory.push({
                type: 'log',
                args: args,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            });
            originalConsole.log.apply(console, args);
        };
        
        console.warn = function(...args) {
            diagnostics.warnings.push({
                type: 'warn',
                args: args,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            });
            originalConsole.warn.apply(console, args);
        };
        
        console.error = function(...args) {
            diagnostics.errors.push({
                type: 'console.error',
                args: args,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            });
            originalConsole.error.apply(console, args);
        };
        
        console.info = function(...args) {
            diagnostics.consoleHistory.push({
                type: 'info',
                args: args,
                timestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            });
            originalConsole.info.apply(console, args);
        };
        
        console.log('[DIAGNOSTICS] Console interception enabled');
    }
    
    /**
     * Monitor fetch requests
     * 
     * Note: This overrides the global fetch function to add monitoring.
     * The original fetch behavior is preserved via the originalFetch reference.
     * This may interact with other libraries that also wrap fetch.
     */
    function monitorFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            const url = args[0];
            const options = args[1] || {};
            const startTime = performance.now();
            
            const requestInfo = {
                url: url,
                method: options.method || 'GET',
                startTime: startTime,
                startTimestamp: new Date().toISOString(),
                timeFromStart: Date.now() - diagnostics.startTime
            };
            
            // Preserve original fetch behavior by calling it directly
            return originalFetch.apply(this, args).then(response => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                requestInfo.endTime = endTime;
                requestInfo.duration = duration;
                requestInfo.status = response.status;
                requestInfo.statusText = response.statusText;
                requestInfo.ok = response.ok;
                requestInfo.endTimestamp = new Date().toISOString();
                
                diagnostics.networkRequests.push(requestInfo);
                
                if (!response.ok) {
                    console.warn(`[DIAGNOSTICS] Request failed: ${options.method || 'GET'} ${url} - ${response.status}`);
                }
                
                return response;
            }).catch(error => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                requestInfo.endTime = endTime;
                requestInfo.duration = duration;
                requestInfo.error = error.message;
                requestInfo.failed = true;
                requestInfo.endTimestamp = new Date().toISOString();
                
                diagnostics.networkRequests.push(requestInfo);
                
                console.error(`[DIAGNOSTICS] Request error: ${options.method || 'GET'} ${url} - ${error.message}`);
                
                throw error;
            });
        };
        
        console.log('[DIAGNOSTICS] Fetch monitoring enabled');
    }
    
    /**
     * Analyze DOM complexity
     */
    function analyzeDOMComplexity() {
        const allElements = document.querySelectorAll('*');
        
        // Count by tag type
        const tagCounts = {};
        allElements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
        
        // Plugin-specific counts
        const pluginElements = document.querySelectorAll('.plugin-item, .plugin-card, [data-plugin]');
        const historyElements = document.querySelectorAll('.history-item, [data-history]');
        
        // Calculate max depth
        function getMaxDepth(element, depth = 0) {
            if (!element || !element.children || element.children.length === 0) {
                return depth;
            }
            return Math.max(...Array.from(element.children).map(child => 
                getMaxDepth(child, depth + 1)
            ));
        }
        
        const complexity = {
            totalElements: allElements.length,
            tagCounts: tagCounts,
            pluginElementCount: pluginElements.length,
            historyElementCount: historyElements.length,
            maxDepth: getMaxDepth(document.body),
            bodyHTMLLength: document.body ? document.body.innerHTML.length : 0,
            timestamp: new Date().toISOString(),
            timeFromStart: Date.now() - diagnostics.startTime
        };
        
        diagnostics.domSnapshots.push(complexity);
        
        return complexity;
    }
    
    /**
     * Measure page performance
     */
    function measurePerformance() {
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0];
        
        return {
            // Navigation Timing
            navigationStart: timing.navigationStart,
            domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
            loadEventEnd: timing.loadEventEnd,
            domInteractive: timing.domInteractive,
            
            // Computed metrics
            pageLoadTime: timing.loadEventEnd - timing.navigationStart,
            domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
            timeToInteractive: timing.domInteractive - timing.navigationStart,
            
            // Resource Timing
            navigation: navigation ? {
                domComplete: navigation.domComplete,
                domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
                domInteractive: navigation.domInteractive,
                loadEventEnd: navigation.loadEventEnd,
                responseEnd: navigation.responseEnd,
                responseStart: navigation.responseStart,
                transferSize: navigation.transferSize,
                encodedBodySize: navigation.encodedBodySize,
                decodedBodySize: navigation.decodedBodySize
            } : null,
            
            // Current memory (if available)
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Generate diagnostic report
     */
    function generateReport() {
        const report = {
            metadata: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                timestamp: new Date().toISOString(),
                sessionDuration: Date.now() - diagnostics.startTime
            },
            errors: diagnostics.errors,
            warnings: diagnostics.warnings,
            networkRequests: diagnostics.networkRequests,
            performance: measurePerformance(),
            domComplexity: analyzeDOMComplexity(),
            consoleHistory: diagnostics.consoleHistory.slice(-100), // Last 100 entries
            performanceMarks: diagnostics.performanceMarks,
            domSnapshots: diagnostics.domSnapshots
        };
        
        return report;
    }
    
    /**
     * Export diagnostics to console
     */
    function exportDiagnostics() {
        const report = generateReport();
        
        console.log('='.repeat(80));
        console.log('PLUGIN MANAGER DIAGNOSTICS REPORT');
        console.log('='.repeat(80));
        console.log('');
        console.log('Session Duration:', (Date.now() - diagnostics.startTime) / 1000, 'seconds');
        console.log('');
        console.log('ERRORS:', diagnostics.errors.length);
        console.log('WARNINGS:', diagnostics.warnings.length);
        console.log('NETWORK REQUESTS:', diagnostics.networkRequests.length);
        console.log('');
        
        if (diagnostics.errors.length > 0) {
            console.log('Latest Errors:');
            diagnostics.errors.slice(-5).forEach((err, i) => {
                console.log(`  ${i + 1}.`, err.message || err.reason || err.args);
            });
            console.log('');
        }
        
        const failedRequests = diagnostics.networkRequests.filter(r => !r.ok || r.failed);
        if (failedRequests.length > 0) {
            console.log('Failed Requests:');
            failedRequests.forEach((req, i) => {
                console.log(`  ${i + 1}. ${req.method} ${req.url} - ${req.status || 'ERROR'}`);
            });
            console.log('');
        }
        
        console.log('DOM Complexity:');
        const latestDOM = diagnostics.domSnapshots[diagnostics.domSnapshots.length - 1];
        if (latestDOM) {
            console.log('  Total Elements:', latestDOM.totalElements);
            console.log('  Plugin Elements:', latestDOM.pluginElementCount);
            console.log('  Max Depth:', latestDOM.maxDepth);
        }
        console.log('');
        
        console.log('Performance:');
        const perf = report.performance;
        console.log('  Page Load Time:', perf.pageLoadTime, 'ms');
        console.log('  DOM Ready Time:', perf.domReadyTime, 'ms');
        console.log('  Time to Interactive:', perf.timeToInteractive, 'ms');
        
        if (perf.memory) {
            console.log('  JS Heap Used:', (perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
        }
        console.log('');
        
        console.log('='.repeat(80));
        console.log('Full Report Object:');
        console.log(report);
        console.log('='.repeat(80));
        console.log('');
        console.log('To download report, run: window.PluginManagerDiagnostics.downloadReport()');
        
        return report;
    }
    
    /**
     * Download diagnostics as JSON file
     */
    function downloadReport() {
        const report = generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plugin-manager-diagnostics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('[DIAGNOSTICS] Report downloaded');
    }
    
    /**
     * Performance marker
     */
    function mark(name) {
        diagnostics.performanceMarks[name] = {
            timestamp: Date.now(),
            timeFromStart: Date.now() - diagnostics.startTime
        };
        
        if (performance.mark) {
            performance.mark(name);
        }
    }
    
    /**
     * Performance measure between marks
     */
    function measure(name, startMark, endMark) {
        const start = diagnostics.performanceMarks[startMark];
        const end = diagnostics.performanceMarks[endMark];
        
        if (start && end) {
            const duration = end.timestamp - start.timestamp;
            console.log(`[DIAGNOSTICS] ${name}: ${duration}ms`);
            return duration;
        }
        
        if (performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
            } catch (e) {
                console.warn('[DIAGNOSTICS] Could not measure:', e.message);
            }
        }
    }
    
    // Public API
    window.PluginManagerDiagnostics.export = exportDiagnostics;
    window.PluginManagerDiagnostics.download = downloadReport;
    window.PluginManagerDiagnostics.downloadReport = downloadReport;
    window.PluginManagerDiagnostics.analyzeDOMComplexity = analyzeDOMComplexity;
    window.PluginManagerDiagnostics.measurePerformance = measurePerformance;
    window.PluginManagerDiagnostics.mark = mark;
    window.PluginManagerDiagnostics.measure = measure;
    
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeErrorHandlers();
            interceptConsole();
            monitorFetch();
            mark('diagnostics-initialized');
            
            console.log('[DIAGNOSTICS] Plugin Manager Diagnostics Module Loaded');
            console.log('[DIAGNOSTICS] Run window.PluginManagerDiagnostics.export() to see report');
            console.log('[DIAGNOSTICS] Run window.PluginManagerDiagnostics.download() to download report');
        });
    } else {
        initializeErrorHandlers();
        interceptConsole();
        monitorFetch();
        mark('diagnostics-initialized');
        
        console.log('[DIAGNOSTICS] Plugin Manager Diagnostics Module Loaded');
        console.log('[DIAGNOSTICS] Run window.PluginManagerDiagnostics.export() to see report');
        console.log('[DIAGNOSTICS] Run window.PluginManagerDiagnostics.download() to download report');
    }
    
    // Periodic DOM snapshots
    setInterval(function() {
        if (diagnostics.enabled) {
            analyzeDOMComplexity();
        }
    }, 5000);
    
})();
