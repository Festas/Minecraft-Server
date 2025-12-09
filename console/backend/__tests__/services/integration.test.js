/**
 * System Integration Test
 * 
 * Tests that all services can initialize and work together
 */

const fs = require('fs');
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

describe('System Integration', () => {
    let eventLogger, notificationService;

    beforeAll(() => {
        // Use test databases
        const testDataDir = path.join(__dirname, '../data-test');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up test databases
        const testDataDir = path.join(__dirname, '../data-test');
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
    });

    describe('Event Logger Integration', () => {
        test('should initialize event logger', () => {
            const { eventLogger: logger } = require('../services/eventLogger');
            logger.dbPath = path.join(__dirname, '../data-test/events.db');
            
            expect(() => logger.initialize()).not.toThrow();
            expect(logger.db).toBeDefined();
            
            eventLogger = logger;
        });

        test('should log an event', () => {
            const { EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('../services/eventLogger');
            
            const eventId = eventLogger.logEvent({
                eventType: EVENT_TYPES.SYSTEM_INFO,
                category: EVENT_CATEGORIES.SYSTEM,
                severity: EVENT_SEVERITY.INFO,
                title: 'Test event',
                actor: 'test'
            });

            expect(eventId).toBeDefined();
            expect(typeof eventId).toBe('number');
        });

        test('should query events', () => {
            const result = eventLogger.queryEvents();
            expect(result).toBeDefined();
            expect(result.events).toBeDefined();
            expect(result.total).toBeGreaterThan(0);
        });
    });

    describe('Notification Service Integration', () => {
        test('should initialize notification service', () => {
            const service = require('../services/notificationService');
            service.dbPath = path.join(__dirname, '../data-test/notifications.db');
            
            expect(() => service.initialize()).not.toThrow();
            expect(service.db).toBeDefined();
            
            notificationService = service;
        });

        test('should get user preferences', () => {
            const prefs = notificationService.getUserPreferences('testuser');
            expect(prefs).toBeDefined();
            expect(prefs.enabled).toBe(true);
            expect(prefs.channels).toBeDefined();
        });

        test('should update user preferences', () => {
            const updated = notificationService.updateUserPreferences('testuser', {
                severity_filter: 'warning',
                channels: ['inbox']
            });

            expect(updated.severity_filter).toBe('warning');
            expect(updated.channels).toEqual(['inbox']);
        });

        test('should create notification from event', () => {
            const { EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('../services/eventLogger');
            
            const event = {
                id: 1,
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started',
                message: 'Test server start',
                actor: 'admin'
            };

            const notificationId = notificationService.createNotification('testuser', event);
            expect(notificationId).toBeDefined();
        });

        test('should get user notifications', () => {
            const result = notificationService.getUserNotifications('testuser');
            expect(result).toBeDefined();
            expect(result.notifications).toBeDefined();
            expect(result.total).toBeGreaterThan(0);
        });

        test('should get unread count', () => {
            const count = notificationService.getUnreadCount('testuser');
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThan(0);
        });
    });

    describe('Event Logger and Notification Integration', () => {
        test('should trigger notification when event is logged', (done) => {
            const { EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('../services/eventLogger');
            
            // Listen for notification event
            notificationService.once('notification', ({ userId, notification }) => {
                expect(userId).toBe('testuser');
                expect(notification).toBeDefined();
                expect(notification.title).toContain('Integration test');
                done();
            });

            // Log event
            eventLogger.once('event', (event) => {
                // Create notification for test user
                notificationService.createNotification('testuser', event);
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.SYSTEM_INFO,
                category: EVENT_CATEGORIES.SYSTEM,
                severity: EVENT_SEVERITY.INFO,
                title: 'Integration test event',
                actor: 'test'
            });
        });
    });
});
