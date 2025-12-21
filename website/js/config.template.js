// Configuration file for festas_builds Minecraft Server Website
// This file is generated at build time from config.template.js
// Environment variables are injected during the Docker build process

window.MC_CONFIG = {
    // Minecraft version - injected from MINECRAFT_VERSION env var
    minecraftVersion: '${MINECRAFT_VERSION}',
    
    // Server software - injected from SERVER_SOFTWARE env var
    serverSoftware: '${SERVER_SOFTWARE}',
    
    // Server address
    serverAddress: 'mc.festas-builds.com',
    
    // Max players
    maxPlayers: 20,
    
    // API endpoints
    statusAPI: 'https://api.mcsrvstat.us/3/',
    
    // External links
    bluemapURL: 'https://mc-maps.festas-builds.com',
    statsURL: 'https://mc-stats.festas-builds.com',
    discordURL: 'https://discord.gg/${DISCORD_INVITE_CODE}',
    githubURL: 'https://github.com/Festas/Minecraft-Server',
    
    // Social media links
    social: {
        tiktok: 'https://www.tiktok.com/@festas_builds',
        instagram: 'https://www.instagram.com/festas_builds',
        youtube: 'https://www.youtube.com/@festas',
        twitch: 'https://www.twitch.tv/festas'
    }
};
