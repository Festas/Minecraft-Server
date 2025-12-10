# Launch Checklist

This checklist ensures all systems are ready for production deployment.

## Pre-Launch (1 Week Before)

### Infrastructure
- [ ] Server hardware meets requirements (4GB+ RAM, 10GB+ disk)
- [ ] Docker and Docker Compose installed
- [ ] Network ports configured (25565 TCP/UDP, 19132 UDP)
- [ ] Firewall rules configured
- [ ] Reverse proxy configured (Nginx/Caddy with SSL)
- [ ] Domain name configured and DNS propagated

### Security
- [ ] All default passwords changed
- [ ] SSH key authentication enabled
- [ ] Firewall configured (only necessary ports open)
- [ ] SSL/TLS certificates installed and valid
- [ ] Session secrets generated (32+ random characters)
- [ ] CSRF secrets generated (32+ random characters)
- [ ] RCON password set (strong, unique)
- [ ] Console admin password set (strong, unique)
- [ ] All secrets stored in environment variables
- [ ] No secrets in version control

### Configuration
- [ ] `.env` file created from `.env.example`
- [ ] Server properties configured (`server.properties`)
- [ ] Console configuration complete
- [ ] Redis configured and running
- [ ] Database initialized
- [ ] Plugin configurations reviewed
- [ ] MOTD customized
- [ ] Server icon uploaded

### GitHub Secrets
- [ ] `SERVER_HOST` configured
- [ ] `SERVER_USER` configured
- [ ] `SSH_PRIVATE_KEY` configured
- [ ] `RCON_PASSWORD` configured
- [ ] `CONSOLE_ADMIN_USER` configured
- [ ] `CONSOLE_ADMIN_PASSWORD` configured
- [ ] `SESSION_SECRET` configured
- [ ] `CSRF_SECRET` configured
- [ ] `REDIS_HOST` configured
- [ ] `REDIS_PORT` configured

### Testing
- [ ] Full QA checklist completed (see QA-CHECKLIST.md)
- [ ] Backend tests passing (405+ tests)
- [ ] Security audit completed (npm audit)
- [ ] Load testing performed
- [ ] Backup/restore tested
- [ ] Disaster recovery plan tested

### Documentation
- [ ] README reviewed and accurate
- [ ] DEPLOYMENT.md reviewed
- [ ] CONSOLE-SETUP.md reviewed
- [ ] Admin guide created/reviewed (ADMIN-GUIDE.md)
- [ ] Player documentation ready
- [ ] Troubleshooting guide accessible

## Launch Day

### Morning (T-4 hours)
- [ ] Final backup of any existing data
- [ ] Verify all dependencies are latest stable versions
- [ ] Review monitoring dashboards
- [ ] Test emergency rollback procedure
- [ ] Notify team of launch timeline

### Pre-Launch (T-1 hour)
- [ ] Deploy application containers
- [ ] Verify all containers healthy
- [ ] Check logs for errors
- [ ] Test basic functionality
- [ ] Verify SSL certificate
- [ ] Test from external network

### Launch (T-0)
- [ ] Start Minecraft server container
- [ ] Monitor server startup logs
- [ ] Verify RCON connectivity
- [ ] Test console access
- [ ] Verify player can connect
- [ ] Check BlueMap/live map
- [ ] Test Discord integration (if configured)

### Post-Launch (T+1 hour)
- [ ] Monitor server performance
- [ ] Check error logs
- [ ] Verify backups running
- [ ] Test all major features
- [ ] Monitor player connections
- [ ] Check Discord/community channels

## Post-Launch (First 24 Hours)

### Monitoring
- [ ] Server uptime stable
- [ ] No critical errors in logs
- [ ] Performance metrics normal (CPU, RAM, TPS)
- [ ] Backup system running correctly
- [ ] Players able to join consistently
- [ ] No plugin conflicts detected

### Community
- [ ] Announcement posted
- [ ] Discord server active
- [ ] Support channels monitored
- [ ] Player feedback collected
- [ ] Initial bugs triaged

### Technical
- [ ] Log rotation working
- [ ] Metrics collection working
- [ ] Automated backups verified
- [ ] Health checks passing
- [ ] SSL auto-renewal configured

## First Week

### Stability
- [ ] No major crashes or rollbacks needed
- [ ] Performance remains stable
- [ ] Backup retention working correctly
- [ ] Automation tasks executing correctly
- [ ] No security incidents

### Community
- [ ] Active player base established
- [ ] Feedback mechanism working
- [ ] Support tickets resolved promptly
- [ ] Community guidelines enforced
- [ ] Events/competitions scheduled

### Optimization
- [ ] Identify performance bottlenecks
- [ ] Optimize plugin configurations
- [ ] Tune JVM flags if needed
- [ ] Adjust view distance if needed
- [ ] Review and adjust rate limits

## Ongoing Maintenance

### Daily
- [ ] Check server health dashboard
- [ ] Review error logs
- [ ] Monitor player feedback
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Update plugins if needed
- [ ] Security audit (npm audit)
- [ ] Review and rotate old backups
- [ ] Community engagement

### Monthly
- [ ] Comprehensive security review
- [ ] Dependency updates
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Disaster recovery drill

## Emergency Procedures

### Server Down
1. Check Docker container status: `docker compose ps`
2. Check logs: `docker compose logs minecraft-server`
3. Check resources: `df -h`, `free -m`
4. Restart if needed: `docker compose restart minecraft-server`
5. Restore from backup if corrupted

### Performance Issues
1. Check TPS: `/tps` command
2. Monitor RAM: Check dashboard
3. Review recent plugin changes
4. Check for chunk errors in logs
5. Consider reducing view distance

### Security Incident
1. Document incident details
2. Isolate affected systems
3. Review access logs
4. Rotate compromised secrets
5. Apply security patches
6. Notify affected users

### Data Loss
1. Stop server immediately
2. Assess extent of data loss
3. Restore from most recent backup
4. Verify restore success
5. Document what was lost
6. Improve backup frequency if needed

## Rollback Procedure

If critical issues arise:
1. Stop all services: `docker compose down`
2. Restore from pre-launch backup
3. Verify backup integrity
4. Start services with old configuration
5. Document issues encountered
6. Plan fix for next deployment

## Sign-Off

### Pre-Launch Sign-Off
- [ ] Technical Lead: ________________ Date: ______
- [ ] Security Review: ________________ Date: ______
- [ ] QA Testing: ________________ Date: ______

### Launch Sign-Off
- [ ] Deployment Verified: ________________ Date: ______
- [ ] Monitoring Active: ________________ Date: ______
- [ ] Team Notified: ________________ Date: ______

### Post-Launch Sign-Off (24 hours)
- [ ] Stable Performance: ________________ Date: ______
- [ ] No Critical Issues: ________________ Date: ______
- [ ] Launch Successful: ________________ Date: ______

---

**Launch Date:** ________________

**Launch Time:** ________________ (Timezone: ________)

**Rollback Deadline:** ________________

**Notes:**
