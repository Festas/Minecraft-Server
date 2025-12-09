# User Analytics & Server Insights

## Overview

The Analytics & Insights feature provides comprehensive visibility into your Minecraft server's performance, player activity, and plugin usage through interactive dashboards with historical and real-time data visualization.

## Features

### Dashboard Overview
- **Player Statistics**: Track unique players, total events, and activity patterns
- **Server Health**: Monitor CPU, memory, TPS, and player counts
- **Plugin Usage**: View active plugins and their usage statistics
- **Time-based Filtering**: Filter data by custom date ranges

### Player Analytics
- **Top Active Players**: Ranked list of most active players by event count
- **Activity Timeline**: Historical view of player activity over time
- **Event Distribution**: Breakdown of player events by type
- **Last Seen Information**: Track when players were last active

### Server Health Monitoring
- **Performance Metrics**: Real-time and historical CPU, memory, and TPS data
- **Resource Usage**: Average and peak resource consumption
- **Player Count Trends**: Track concurrent player counts over time
- **Performance Summary**: Statistical analysis of server health

### Plugin Usage Statistics
- **Active Plugins**: List of all plugins with usage metrics
- **Event Tracking**: Monitor plugin events and interactions
- **Version Information**: Track plugin versions in use
- **Usage Patterns**: Identify most and least used plugins

## Accessing Analytics

1. Navigate to the main console dashboard
2. Click on **📊 Analytics** in the sidebar navigation
3. The analytics dashboard will load with overview statistics

## Using Filters

### Date Range Filtering

Filter analytics data by specific date ranges:

1. Use the **From** date picker to select start date
2. Use the **To** date picker to select end date
3. Click **Apply Filter** to update all analytics
4. Click **Clear** to remove filters and show all data

### Refreshing Data

- Click the **🔄 Refresh** button to manually reload analytics data
- Data automatically refreshes every 5 minutes
- Recent changes may take a few minutes to appear

## Exporting Data

Analytics data can be exported in multiple formats:

### CSV Export
1. Navigate to the desired analytics tab (Players, Server, or Plugins)
2. Click the **📥 CSV** button in the chart header
3. File will download automatically with timestamp in filename
4. Open in Excel, Google Sheets, or any spreadsheet application

### JSON Export
1. Navigate to the desired analytics tab
2. Click the **📥 JSON** button in the chart header
3. File downloads with complete analytics data
4. Use for programmatic analysis or integration

### Print/PDF
1. Navigate to desired view
2. Click the **🖨️ Print** button
3. Use browser's print dialog to save as PDF or print

## Privacy Controls

### Data Collection Settings

Access privacy settings by:
1. Click **⚙️ Settings** button or navigate to **Privacy** tab
2. Configure data collection preferences:

#### Available Options

- **Collect Player Activity Data**
  - Controls tracking of player events (joins, leaves, interactions)
  - Disabling stops new player event collection
  - Historical data is preserved

- **Collect Server Health Metrics**
  - Controls collection of CPU, memory, and TPS data
  - Metrics collected every 5 minutes when enabled
  - Essential for performance monitoring

- **Collect Plugin Usage Data**
  - Tracks plugin interactions and usage patterns
  - Helps identify which plugins are actively used
  - Useful for optimization decisions

- **Data Retention (days)**
  - Automatically delete data older than specified days
  - Range: 1-365 days (default: 90 days)
  - Daily cleanup runs at midnight
  - Helps manage database size

### Saving Privacy Settings

1. Adjust settings as desired
2. Click **Save Settings** button
3. Confirmation message appears
4. Changes take effect immediately

### Opt-Out Recommendations

For privacy-focused deployments:
- Set data retention to minimum needed (e.g., 30 days)
- Disable player data collection if not needed
- Keep server metrics enabled for troubleshooting
- Review collected data periodically

## Data Storage

- Analytics data stored in SQLite database: `console/backend/data/analytics.db`
- Separate from main player database
- Indexed for fast queries
- Automated cleanup based on retention settings

## Role-Based Access

### Permissions

| Role | View Analytics | Export Data | Manage Settings |
|------|----------------|-------------|-----------------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Moderator | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ |

### Access Requirements

- **ANALYTICS_VIEW**: Required to view analytics dashboard
- **ANALYTICS_EXPORT**: Required to export data (CSV/JSON)
- **ANALYTICS_MANAGE**: Required to modify privacy settings

## API Endpoints

For programmatic access:

### Dashboard Overview
```
GET /api/analytics/dashboard?startDate=2024-01-01&endDate=2024-01-31
```

### Player Analytics
```
GET /api/analytics/players?startDate=2024-01-01&endDate=2024-01-31
```

### Server Health
```
GET /api/analytics/server?startDate=2024-01-01&endDate=2024-01-31
```

### Plugin Usage
```
GET /api/analytics/plugins?startDate=2024-01-01&endDate=2024-01-31
```

### Export Data
```
GET /api/analytics/export?format=csv&dataType=players&startDate=2024-01-01
```

### Privacy Settings
```
GET /api/analytics/settings
POST /api/analytics/settings
```

## Troubleshooting

### No Data Appearing

**Problem**: Analytics dashboard shows no data

**Solutions**:
1. Check if data collection is enabled in Privacy settings
2. Verify server has been running and collecting events
3. Ensure date filters aren't excluding all data
4. Check server logs for analytics initialization errors
5. Verify database file exists: `console/backend/data/analytics.db`

### Export Not Working

**Problem**: Export button doesn't download file

**Solutions**:
1. Check browser popup blocker settings
2. Verify you have ANALYTICS_EXPORT permission
3. Try different export format (CSV vs JSON)
4. Check browser console for JavaScript errors
5. Ensure browser allows downloads from console domain

### Slow Dashboard Loading

**Problem**: Analytics page loads slowly

**Solutions**:
1. Reduce date range to smaller period
2. Lower data retention to reduce database size
3. Check server resource usage (CPU/memory)
4. Consider archiving old data manually
5. Optimize by disabling unused data collection

### Missing Recent Data

**Problem**: Latest events not showing in analytics

**Solutions**:
1. Click Refresh button to reload data
2. Wait for auto-refresh (5 minutes)
3. Verify events are being logged in event logger
4. Check that data collection is enabled
5. Restart analytics service if needed

### Privacy Settings Not Saving

**Problem**: Changes to privacy settings don't persist

**Solutions**:
1. Verify you have ANALYTICS_MANAGE permission
2. Check server logs for error messages
3. Ensure database is writable
4. Verify values are in valid ranges
5. Try refreshing page and reapplying changes

## Performance Considerations

### Data Collection Impact

- Minimal CPU overhead (~0.1% average)
- Database writes batched efficiently
- Metrics collected every 5 minutes
- Negligible impact on gameplay

### Database Size

Estimated database growth:
- ~1MB per week for small server (1-10 players)
- ~10MB per week for medium server (10-50 players)
- ~50MB per week for large server (50+ players)

Recommendations:
- Set appropriate retention period
- Monitor database size regularly
- Archive old data if needed
- Consider external analytics for very large servers

### Optimization Tips

1. **Reduce Retention**: Lower retention days if storage is limited
2. **Selective Collection**: Disable unneeded data types
3. **Filter Queries**: Use date filters for faster queries
4. **Regular Cleanup**: Let automated cleanup run nightly
5. **Monitor Performance**: Check server resources periodically

## Integration

### Event Logger Integration

Analytics automatically captures events from:
- Player tracking system
- Plugin lifecycle events
- Server events
- Automation tasks

### Custom Event Tracking

To track custom events in your code:

```javascript
const analyticsService = require('./services/analyticsService');

// Record player event
analyticsService.recordPlayerEvent(
    playerUuid,
    playerUsername,
    'custom.event.type',
    { additionalData: 'value' }
);

// Record plugin usage
analyticsService.recordPluginUsage(
    'MyPlugin',
    '1.0.0',
    'plugin.custom.action'
);

// Record server metrics
analyticsService.recordServerMetrics({
    cpu_percent: 45.5,
    memory_percent: 60.2,
    tps: 19.8,
    player_count: 10
});
```

## Best Practices

1. **Regular Review**: Check analytics weekly for insights
2. **Set Appropriate Retention**: Balance storage vs. history needs
3. **Export Important Data**: Periodically export for archival
4. **Monitor Trends**: Watch for unusual patterns
5. **Privacy First**: Respect player privacy with minimal collection
6. **Use Filters**: Focus on relevant time periods
7. **Share Insights**: Export reports for team discussion

## Future Enhancements

Planned features:
- Advanced charting with interactive graphs
- Automated report generation
- Alert thresholds for performance issues
- Player behavior predictions
- Custom dashboard widgets
- Real-time streaming updates
- Enhanced plugin analytics
- Comparative analysis tools

## Related Documentation

- [Advanced Logging & Notifications](advanced-logging-notifications.md)
- [Automation & Scheduler](automation-scheduler.md)
- [User Management](user-management.md)
- [Player Management](player-management.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for error messages
3. Consult related documentation
4. Report bugs with log excerpts and steps to reproduce
