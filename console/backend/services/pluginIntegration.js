const axios = require('axios');
const rconService = require('./rcon');

class PluginIntegrationService {
    constructor() {
        this.cache = {
            spark: { data: null, timestamp: 0 },
            plan: { data: null, timestamp: 0 },
            serverTap: { data: null, timestamp: 0 }
        };
        this.cacheTimeout = 5000; // 5 seconds

        // Plugin configuration from environment
        this.config = {
            serverTap: {
                enabled: process.env.SERVERTAP_ENABLED === 'true',
                host: process.env.SERVERTAP_HOST || 'localhost',
                port: process.env.SERVERTAP_PORT || '4567',
                apiKey: process.env.SERVERTAP_API_KEY || ''
            },
            plan: {
                enabled: process.env.PLAN_ENABLED === 'true',
                host: process.env.PLAN_HOST || 'localhost',
                port: process.env.PLAN_PORT || '8804'
            }
        };
    }

    /**
     * Get Spark metrics via RCON commands
     */
    async getSparkMetrics() {
        const now = Date.now();
        
        // Return cached data if fresh
        if (this.cache.spark.data && (now - this.cache.spark.timestamp) < this.cacheTimeout) {
            return this.cache.spark.data;
        }

        try {
            // Check if RCON is connected
            if (!rconService.isConnected()) {
                return null;
            }

            // Try spark tps command first
            let tpsResult = await rconService.executeCommand('spark tps');
            let healthResult = await rconService.executeCommand('spark health');

            const metrics = {
                available: false,
                tps: null,
                cpu: null,
                memory: null
            };

            // Parse TPS from spark tps output
            if (tpsResult.success && tpsResult.response) {
                // Example: "TPS from last 1m, 5m, 15m: 20.0, 20.0, 20.0"
                const tpsMatch = tpsResult.response.match(/TPS.*?:\s*([\d.]+)/i);
                if (tpsMatch) {
                    const tpsValue = parseFloat(tpsMatch[1]);
                    // Validate TPS is in reasonable range (0-20)
                    if (!isNaN(tpsValue) && tpsValue >= 0 && tpsValue <= 20) {
                        metrics.tps = tpsValue;
                        metrics.available = true;
                    }
                }
            }

            // Parse CPU and Memory from spark health output
            if (healthResult.success && healthResult.response) {
                // Example output may contain "CPU: 45.2%" or "Memory: 2048MB / 4096MB"
                const cpuMatch = healthResult.response.match(/CPU.*?(\d+(?:\.\d+)?)/i);
                const memoryMatch = healthResult.response.match(/Memory.*?(\d+(?:\.\d+)?)\s*(\w+).*?\/\s*(\d+(?:\.\d+)?)\s*(\w+)/i);
                
                if (cpuMatch) {
                    const cpuValue = parseFloat(cpuMatch[1]);
                    // Validate CPU is in reasonable range (0-100%)
                    if (!isNaN(cpuValue) && cpuValue >= 0 && cpuValue <= 100) {
                        metrics.cpu = cpuValue;
                        metrics.available = true;
                    }
                }
                
                if (memoryMatch) {
                    const used = parseFloat(memoryMatch[1]);
                    const usedUnit = memoryMatch[2];
                    const total = parseFloat(memoryMatch[3]);
                    const totalUnit = memoryMatch[4];
                    
                    // Validate memory values are positive and used <= total
                    if (!isNaN(used) && !isNaN(total) && used > 0 && total > 0 && used <= total) {
                        metrics.memory = {
                            used: `${used}${usedUnit}`,
                            total: `${total}${totalUnit}`,
                            percentage: (used / total) * 100
                        };
                        metrics.available = true;
                    }
                }
            }

            // Cache the result
            this.cache.spark.data = metrics;
            this.cache.spark.timestamp = now;

            return metrics;
        } catch (error) {
            console.error('Error getting Spark metrics:', error.message);
            return null;
        }
    }

    /**
     * Get Plan analytics via HTTP API
     */
    async getPlanAnalytics() {
        const now = Date.now();
        
        // Return cached data if fresh
        if (this.cache.plan.data && (now - this.cache.plan.timestamp) < this.cacheTimeout) {
            return this.cache.plan.data;
        }

        if (!this.config.plan.enabled) {
            return null;
        }

        try {
            const baseUrl = `http://${this.config.plan.host}:${this.config.plan.port}`;
            
            // Try to get server overview data
            const response = await axios.get(`${baseUrl}/v1/serverOverview`, {
                timeout: 3000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = response.data;
            
            const analytics = {
                available: true,
                playersToday: data.numbers?.players_day || 0,
                playersWeek: data.numbers?.players_week || 0,
                peakPlayers: data.numbers?.max_players || 0,
                avgSessionLength: data.numbers?.average_session_length || 0,
                topPlayers: []
            };

            // Try to get top players
            try {
                const playersResponse = await axios.get(`${baseUrl}/v1/players`, {
                    timeout: 3000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (playersResponse.data && playersResponse.data.players) {
                    // Get top 5 by playtime
                    analytics.topPlayers = playersResponse.data.players
                        .sort((a, b) => (b.playtime || 0) - (a.playtime || 0))
                        .slice(0, 5)
                        .map(p => ({
                            name: p.name,
                            playtime: p.playtime || 0
                        }));
                }
            } catch (playersError) {
                console.error('Error fetching top players from Plan:', playersError.message);
            }

            // Cache the result
            this.cache.plan.data = analytics;
            this.cache.plan.timestamp = now;

            return analytics;
        } catch (error) {
            console.error('Error getting Plan analytics:', error.message);
            return null;
        }
    }

    /**
     * Get ServerTap data via REST API
     */
    async getServerTapData() {
        const now = Date.now();
        
        // Return cached data if fresh
        if (this.cache.serverTap.data && (now - this.cache.serverTap.timestamp) < this.cacheTimeout) {
            return this.cache.serverTap.data;
        }

        if (!this.config.serverTap.enabled) {
            return null;
        }

        try {
            const baseUrl = `http://${this.config.serverTap.host}:${this.config.serverTap.port}`;
            const headers = {
                'Accept': 'application/json'
            };

            if (this.config.serverTap.apiKey) {
                headers['key'] = this.config.serverTap.apiKey;
            }

            const response = await axios.get(`${baseUrl}/v1/server`, {
                timeout: 3000,
                headers
            });

            const data = response.data;
            
            const serverData = {
                available: true,
                tps: data.tps || null,
                players: {
                    online: data.players?.length || 0,
                    max: data.maxPlayers || 20
                },
                worlds: data.worlds || []
            };

            // Cache the result
            this.cache.serverTap.data = serverData;
            this.cache.serverTap.timestamp = now;

            return serverData;
        } catch (error) {
            console.error('Error getting ServerTap data:', error.message);
            return null;
        }
    }

    /**
     * Get combined metrics from all available plugins
     * Priority: Spark > ServerTap > Defaults
     */
    async getCombinedMetrics() {
        const [spark, serverTap] = await Promise.all([
            this.getSparkMetrics(),
            this.getServerTapData()
        ]);

        const metrics = {
            tps: 20.0,
            cpu: null,
            memory: null,
            dataSources: {
                tps: 'default',
                cpu: 'default',
                memory: 'default'
            }
        };

        // Use Spark data if available (highest priority)
        if (spark && spark.available) {
            if (spark.tps !== null) {
                metrics.tps = spark.tps;
                metrics.dataSources.tps = 'spark';
            }
            if (spark.cpu !== null) {
                metrics.cpu = spark.cpu;
                metrics.dataSources.cpu = 'spark';
            }
            if (spark.memory !== null) {
                metrics.memory = spark.memory;
                metrics.dataSources.memory = 'spark';
            }
        }

        // Use ServerTap as fallback for TPS
        if (metrics.dataSources.tps === 'default' && serverTap && serverTap.available && serverTap.tps !== null) {
            metrics.tps = serverTap.tps;
            metrics.dataSources.tps = 'servertap';
        }

        return metrics;
    }

    /**
     * Get dashboard analytics (for the /server/dashboard endpoint)
     */
    async getDashboardAnalytics() {
        const plan = await this.getPlanAnalytics();

        if (plan && plan.available) {
            return {
                available: true,
                playersToday: plan.playersToday,
                playersWeek: plan.playersWeek,
                peakPlayers: plan.peakPlayers,
                avgSessionLength: plan.avgSessionLength,
                topPlayers: plan.topPlayers,
                source: 'plan'
            };
        }

        // Return placeholder data if Plan is not available
        return {
            available: false,
            playersToday: 0,
            playersWeek: 0,
            peakPlayers: 0,
            avgSessionLength: 0,
            topPlayers: [],
            source: 'none'
        };
    }

    /**
     * Check which plugins are available
     */
    async checkPluginStatus() {
        const [spark, plan, serverTap] = await Promise.all([
            this.getSparkMetrics(),
            this.getPlanAnalytics(),
            this.getServerTapData()
        ]);

        return {
            spark: spark && spark.available ? true : false,
            plan: plan && plan.available ? true : false,
            serverTap: serverTap && serverTap.available ? true : false
        };
    }
}

module.exports = new PluginIntegrationService();
