const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Store antilink settings for each guild
const guildsWithAntilink = new Map();
const dataPath = path.join(__dirname, '../../database/antilink.json');

// Load existing data
function loadAntilinkData() {
    try {
        if (fs.existsSync(dataPath)) {
            const fileContent = fs.readFileSync(dataPath, 'utf8');
            
            // Check if file is empty or whitespace only
            if (!fileContent || fileContent.trim() === '') {
                console.log('Antilink data file exists but is empty, starting with fresh data');
                return;
            }
            
            try {
                const data = JSON.parse(fileContent);
                
                // Convert the data back to a Map
                Object.entries(data).forEach(([guildId, settings]) => {
                    guildsWithAntilink.set(guildId, {
                        enabled: settings.enabled,
                        allowedRoles: new Set(settings.allowedRoles),
                        timeout: settings.timeout || 0
                    });
                });
                
                console.log('Loaded antilink data from disk');
            } catch (parseError) {
                console.error('Error parsing antilink JSON data, starting with fresh data:', parseError.message);
                // Create a backup of the corrupted file
                if (fileContent.length > 0) {
                    const backupPath = `${dataPath}.backup-${Date.now()}`;
                    fs.writeFileSync(backupPath, fileContent);
                    console.log(`Created backup of corrupted data at ${backupPath}`);
                }
            }
        }
    } catch (error) {
        console.error('Error accessing antilink data file:', error.message);
    }
}

// Save data to disk
function saveAntilinkData() {
    try {
        // Create data directory if it doesn't exist
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Convert Map to object for JSON serialization
        const data = {};
        guildsWithAntilink.forEach((settings, guildId) => {
            data[guildId] = {
                enabled: settings.enabled,
                allowedRoles: Array.from(settings.allowedRoles),
                timeout: settings.timeout
            };
        });
        
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving antilink data:', error);
    }
}

// Load data on startup
loadAntilinkData();

// Helper functions
function formatRolesList(roles) {
    return Array.from(roles)
        .map(id => `<@&${id}>`)
        .join('\n• ');
}

// Expose both data and functions for other antilink commands
module.exports = {
    guildsWithAntilink,
    saveAntilinkData,
    formatRolesList,
    dataPath
}; 