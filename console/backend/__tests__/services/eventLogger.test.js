/**
 * Event Logger Service Tests
 */

const fs = require('fs');
const path = require('path');
const { eventLogger, EVENT_CATEGORIES, EVENT_SEVERITY, EVENT_TYPES } = require('../../services/eventLogger');

// Use a test database
const TEST_DB_PATH = path.join(__dirname, '../../data/events-test.db');

describe('Event Logger Service', () => {
    beforeAll(() => {
        // Override database path for testing
        eventLogger.dbPath = TEST_DB_PATH;
        eventLogger.initialize();
    });

    afterAll(() => {
        // Clean up test database
        eventLogger.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        // Clean up WAL files
        const walPath = TEST_DB_PATH + '-wal';
        const shmPath = TEST_DB_PATH + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    });

    beforeEach(() => {
        // Clear events table before each test
        if (eventLogger.db) {
            eventLogger.db.exec('DELETE FROM events');
        }
    });

    describe('Initialization', () => {
        test('should initialize database successfully', () => {
            expect(eventLogger.db).toBeDefined();
            expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
        });

        test('should create events table', () => {
            const result = eventLogger.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
            ).get();
            expect(result).toBeDefined();
            expect(result.name).toBe('events');
        });

        test('should create indexes', () => {
            const indexes = eventLogger.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='events'"
            ).all();
            expect(indexes.length).toBeGreaterThan(0);
        });
    });

    describe('logEvent()', () => {
        test('should log a basic event', () => {
            const eventId = eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started',
                actor: 'admin'
            });

            expect(eventId).toBeDefined();
            expect(typeof eventId).toBe('number');
        });

        test('should log event with all fields', () => {
            const eventId = eventLogger.logEvent({
                eventType: EVENT_TYPES.PLUGIN_INSTALLED,
                category: EVENT_CATEGORIES.PLUGIN,
                severity: EVENT_SEVERITY.INFO,
                title: 'Plugin installed',
                message: 'EssentialsX plugin installed successfully',
                actor: 'admin',
                target: 'EssentialsX',
                metadata: { version: '2.20.1' }
            });

            const event = eventLogger.getEventById(eventId);
            expect(event).toBeDefined();
            expect(event.event_type).toBe(EVENT_TYPES.PLUGIN_INSTALLED);
            expect(event.category).toBe(EVENT_CATEGORIES.PLUGIN);
            expect(event.severity).toBe(EVENT_SEVERITY.INFO);
            expect(event.title).toBe('Plugin installed');
            expect(event.message).toBe('EssentialsX plugin installed successfully');
            expect(event.actor).toBe('admin');
            expect(event.target).toBe('EssentialsX');
            expect(event.metadata).toEqual({ version: '2.20.1' });
        });

        test('should default to system actor if not provided', () => {
            const eventId = eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started'
            });

            const event = eventLogger.getEventById(eventId);
            expect(event.actor).toBe('system');
        });

        test('should default to INFO severity if not provided', () => {
            const eventId = eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                title: 'Server started',
                actor: 'admin'
            });

            const event = eventLogger.getEventById(eventId);
            expect(event.severity).toBe(EVENT_SEVERITY.INFO);
        });

        test('should emit event for real-time notifications', (done) => {
            eventLogger.once('event', (event) => {
                expect(event).toBeDefined();
                expect(event.id).toBeDefined();
                expect(event.title).toBe('Test event');
                done();
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.SYSTEM_INFO,
                category: EVENT_CATEGORIES.SYSTEM,
                severity: EVENT_SEVERITY.INFO,
                title: 'Test event',
                actor: 'test'
            });
        });
    });

    describe('queryEvents()', () => {
        beforeEach(() => {
            // Create test events
            eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started',
                actor: 'admin'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_STOP,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.WARNING,
                title: 'Server stopped',
                actor: 'admin'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.PLUGIN_INSTALLED,
                category: EVENT_CATEGORIES.PLUGIN,
                severity: EVENT_SEVERITY.INFO,
                title: 'Plugin installed',
                actor: 'moderator',
                target: 'EssentialsX'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.PLAYER_KICKED,
                category: EVENT_CATEGORIES.PLAYER,
                severity: EVENT_SEVERITY.WARNING,
                title: 'Player kicked',
                actor: 'admin',
                target: 'TestPlayer'
            });
        });

        test('should query all events', () => {
            const result = eventLogger.queryEvents();
            expect(result.events).toBeDefined();
            expect(result.events.length).toBe(4);
            expect(result.total).toBe(4);
        });

        test('should filter by category', () => {
            const result = eventLogger.queryEvents({ category: EVENT_CATEGORIES.SERVER });
            expect(result.events.length).toBe(2);
            expect(result.events.every(e => e.category === EVENT_CATEGORIES.SERVER)).toBe(true);
        });

        test('should filter by severity', () => {
            const result = eventLogger.queryEvents({ severity: EVENT_SEVERITY.WARNING });
            expect(result.events.length).toBe(2);
            expect(result.events.every(e => e.severity === EVENT_SEVERITY.WARNING)).toBe(true);
        });

        test('should filter by event type', () => {
            const result = eventLogger.queryEvents({ eventType: EVENT_TYPES.SERVER_START });
            expect(result.events.length).toBe(1);
            expect(result.events[0].event_type).toBe(EVENT_TYPES.SERVER_START);
        });

        test('should filter by actor', () => {
            const result = eventLogger.queryEvents({ actor: 'moderator' });
            expect(result.events.length).toBe(1);
            expect(result.events[0].actor).toBe('moderator');
        });

        test('should filter by target', () => {
            const result = eventLogger.queryEvents({ target: 'EssentialsX' });
            expect(result.events.length).toBe(1);
            expect(result.events[0].target).toBe('EssentialsX');
        });

        test('should search in title and message', () => {
            const result = eventLogger.queryEvents({ search: 'kicked' });
            expect(result.events.length).toBe(1);
            expect(result.events[0].title).toContain('kicked');
        });

        test('should apply limit', () => {
            const result = eventLogger.queryEvents({ limit: 2 });
            expect(result.events.length).toBe(2);
            expect(result.limit).toBe(2);
        });

        test('should apply offset', () => {
            const result = eventLogger.queryEvents({ limit: 2, offset: 2 });
            expect(result.events.length).toBe(2);
            expect(result.offset).toBe(2);
        });

        test('should sort by timestamp descending by default', () => {
            const result = eventLogger.queryEvents();
            const timestamps = result.events.map(e => new Date(e.timestamp));
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i - 1] >= timestamps[i]).toBe(true);
            }
        });

        test('should sort ascending when specified', () => {
            const result = eventLogger.queryEvents({ sortOrder: 'asc' });
            const timestamps = result.events.map(e => new Date(e.timestamp));
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i - 1] <= timestamps[i]).toBe(true);
            }
        });

        test('should combine multiple filters', () => {
            const result = eventLogger.queryEvents({
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.WARNING,
                actor: 'admin'
            });
            expect(result.events.length).toBe(1);
            expect(result.events[0].event_type).toBe(EVENT_TYPES.SERVER_STOP);
        });

        test('should indicate if more results available', () => {
            const result = eventLogger.queryEvents({ limit: 2 });
            expect(result.hasMore).toBe(true);
        });
    });

    describe('getRecentEvents()', () => {
        beforeEach(() => {
            // Create test events
            for (let i = 0; i < 10; i++) {
                eventLogger.logEvent({
                    eventType: EVENT_TYPES.SYSTEM_INFO,
                    category: EVENT_CATEGORIES.SYSTEM,
                    severity: EVENT_SEVERITY.INFO,
                    title: `Event ${i}`,
                    actor: 'system'
                });
            }
        });

        test('should get recent events with default limit', () => {
            const events = eventLogger.getRecentEvents();
            expect(events).toBeDefined();
            expect(events.length).toBeLessThanOrEqual(50);
        });

        test('should respect custom limit', () => {
            const events = eventLogger.getRecentEvents(5);
            expect(events.length).toBe(5);
        });

        test('should return events in descending order', () => {
            const events = eventLogger.getRecentEvents(10);
            const timestamps = events.map(e => new Date(e.timestamp));
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i - 1] >= timestamps[i]).toBe(true);
            }
        });
    });

    describe('getEventStats()', () => {
        beforeEach(() => {
            // Create diverse test events
            eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started',
                actor: 'admin'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.SERVER_START,
                category: EVENT_CATEGORIES.SERVER,
                severity: EVENT_SEVERITY.INFO,
                title: 'Server started again',
                actor: 'admin'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.PLUGIN_INSTALLED,
                category: EVENT_CATEGORIES.PLUGIN,
                severity: EVENT_SEVERITY.INFO,
                title: 'Plugin installed',
                actor: 'admin'
            });

            eventLogger.logEvent({
                eventType: EVENT_TYPES.PLAYER_KICKED,
                category: EVENT_CATEGORIES.PLAYER,
                severity: EVENT_SEVERITY.WARNING,
                title: 'Player kicked',
                actor: 'moderator'
            });
        });

        test('should get total count', () => {
            const stats = eventLogger.getEventStats();
            expect(stats.total).toBe(4);
        });

        test('should count by category', () => {
            const stats = eventLogger.getEventStats();
            expect(stats.byCategory).toBeDefined();
            expect(stats.byCategory.find(c => c.category === EVENT_CATEGORIES.SERVER).count).toBe(2);
            expect(stats.byCategory.find(c => c.category === EVENT_CATEGORIES.PLUGIN).count).toBe(1);
            expect(stats.byCategory.find(c => c.category === EVENT_CATEGORIES.PLAYER).count).toBe(1);
        });

        test('should count by severity', () => {
            const stats = eventLogger.getEventStats();
            expect(stats.bySeverity).toBeDefined();
            expect(stats.bySeverity.find(s => s.severity === EVENT_SEVERITY.INFO).count).toBe(3);
            expect(stats.bySeverity.find(s => s.severity === EVENT_SEVERITY.WARNING).count).toBe(1);
        });

        test('should count by event type', () => {
            const stats = eventLogger.getEventStats();
            expect(stats.byEventType).toBeDefined();
            expect(stats.byEventType.find(t => t.event_type === EVENT_TYPES.SERVER_START).count).toBe(2);
        });
    });

    describe('deleteOldEvents()', () => {
        test('should delete events older than specified days', () => {
            // Create an old event by manually inserting
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 100);
            
            eventLogger.db.prepare(`
                INSERT INTO events 
                (event_type, category, severity, title, actor, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                EVENT_TYPES.SYSTEM_INFO,
                EVENT_CATEGORIES.SYSTEM,
                EVENT_SEVERITY.INFO,
                'Old event',
                'system',
                oldDate.toISOString()
            );

            // Create a recent event
            eventLogger.logEvent({
                eventType: EVENT_TYPES.SYSTEM_INFO,
                category: EVENT_CATEGORIES.SYSTEM,
                severity: EVENT_SEVERITY.INFO,
                title: 'Recent event',
                actor: 'system'
            });

            // Delete events older than 90 days
            const deleted = eventLogger.deleteOldEvents(90);
            expect(deleted).toBe(1);

            // Verify only recent event remains
            const result = eventLogger.queryEvents();
            expect(result.total).toBe(1);
            expect(result.events[0].title).toBe('Recent event');
        });
    });
});
