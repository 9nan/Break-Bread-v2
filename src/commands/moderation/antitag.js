const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Store antitag settings for each guild
const guildsWithAntitag = new Map();
const dataPath = path.join(__dirname, '../../database/antitag.json');

// Load existing data
function loadAntitagData() {
    try {
        if (fs.existsSync(dataPath)) {
            const fileContent = fs.readFileSync(dataPath, 'utf8');
            
            // Check if file is empty or whitespace only
            if (!fileContent || fileContent.trim() === '') {
                console.log('Antitag data file exists but is empty, starting with fresh data');
                return;
            }
            
            try {
                const data = JSON.parse(fileContent);
                
                // Convert the data back to a Map
                Object.entries(data).forEach(([guildId, settings]) => {
                    guildsWithAntitag.set(guildId, {
                        enabled: settings.enabled,
                        allowedRoles: new Set(settings.allowedRoles),
                        timeout: settings.timeout || 0
                    });
                });
                
                console.log('Loaded antitag data from disk');
            } catch (parseError) {
                console.error('Error parsing antitag JSON data, starting with fresh data:', parseError.message);
                // Create a backup of the corrupted file
                if (fileContent.length > 0) {
                    const backupPath = `${dataPath}.backup-${Date.now()}`;
                    fs.writeFileSync(backupPath, fileContent);
                    console.log(`Created backup of corrupted data at ${backupPath}`);
                }
            }
        }
    } catch (error) {
        console.error('Error accessing antitag data file:', error.message);
    }
}

// Save data to disk
function saveAntitagData() {
    try {
        // Create data directory if it doesn't exist
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Convert Map to object for JSON serialization
        const data = {};
        guildsWithAntitag.forEach((settings, guildId) => {
            data[guildId] = {
                enabled: settings.enabled,
                allowedRoles: Array.from(settings.allowedRoles),
                timeout: settings.timeout
            };
        });
        
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving antitag data:', error);
    }
}

// Load data on startup
loadAntitagData();

// Helper functions
function formatRolesList(roles) {
    return Array.from(roles)
        .map(id => `<@&${id}>`)
        .join('\n• ');
}

// Expose both data and functions for other antitag commands
module.exports = {
    guildsWithAntitag,
    saveAntitagData,
    formatRolesList,
    dataPath
}; 