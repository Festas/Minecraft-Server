const Docker = require('dockerode');

class DockerService {
    constructor() {
        this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
        this.containerName = process.env.MC_CONTAINER_NAME || 'minecraft-server';
    }

    /**
     * Get container by name
     */
    async getContainer() {
        try {
            const containers = await this.docker.listContainers({ all: true });
            const containerInfo = containers.find(c => 
                c.Names.includes(`/${this.containerName}`)
            );
            
            if (!containerInfo) {
                throw new Error('Minecraft container not found');
            }
            
            return this.docker.getContainer(containerInfo.Id);
        } catch (error) {
            console.error('Error getting container:', error);
            throw error;
        }
    }

    /**
     * Start the Minecraft server
     */
    async startServer() {
        try {
            const container = await this.getContainer();
            await container.start();
            return { success: true, message: 'Server starting...' };
        } catch (error) {
            console.error('Error starting server:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop the Minecraft server
     */
    async stopServer() {
        try {
            const container = await this.getContainer();
            await container.stop({ t: 30 }); // 30 second timeout
            return { success: true, message: 'Server stopped' };
        } catch (error) {
            console.error('Error stopping server:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Kill the Minecraft server (force stop)
     */
    async killServer() {
        try {
            const container = await this.getContainer();
            await container.kill();
            return { success: true, message: 'Server killed' };
        } catch (error) {
            console.error('Error killing server:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Restart the Minecraft server
     */
    async restartServer() {
        try {
            const container = await this.getContainer();
            await container.restart({ t: 30 });
            return { success: true, message: 'Server restarting...' };
        } catch (error) {
            console.error('Error restarting server:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get container stats
     */
    async getStats() {
        try {
            const container = await this.getContainer();
            const stats = await container.stats({ stream: false });
            
            // Calculate CPU usage
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                           stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - 
                              stats.precpu_stats.system_cpu_usage;
            const cpuPercent = (cpuDelta / systemDelta) * 
                             stats.cpu_stats.online_cpus * 100;

            // Calculate memory usage
            const memUsage = stats.memory_stats.usage;
            const memLimit = stats.memory_stats.limit;
            const memPercent = (memUsage / memLimit) * 100;

            return {
                cpu: cpuPercent.toFixed(2),
                memory: {
                    used: (memUsage / 1024 / 1024 / 1024).toFixed(2), // GB
                    limit: (memLimit / 1024 / 1024 / 1024).toFixed(2), // GB
                    percent: memPercent.toFixed(2)
                }
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    /**
     * Get container status
     */
    async getStatus() {
        try {
            const container = await this.getContainer();
            const info = await container.inspect();
            
            return {
                running: info.State.Running,
                status: info.State.Status,
                startedAt: info.State.StartedAt,
                uptime: info.State.Running ? 
                    Math.floor((Date.now() - new Date(info.State.StartedAt).getTime()) / 1000) : 0
            };
        } catch (error) {
            console.error('Error getting status:', error);
            return { running: false, status: 'unknown', uptime: 0 };
        }
    }

    /**
     * Get container logs
     */
    async getLogs(tail = 100) {
        try {
            const container = await this.getContainer();
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: tail,
                timestamps: true
            });
            
            return logs.toString('utf8');
        } catch (error) {
            console.error('Error getting logs:', error);
            return '';
        }
    }

    /**
     * Stream container logs
     */
    async streamLogs(callback) {
        try {
            const container = await this.getContainer();
            const stream = await container.logs({
                stdout: true,
                stderr: true,
                follow: true,
                timestamps: true
            });

            stream.on('data', (chunk) => {
                callback(chunk.toString('utf8'));
            });

            return stream;
        } catch (error) {
            console.error('Error streaming logs:', error);
            throw error;
        }
    }
}

module.exports = new DockerService();
