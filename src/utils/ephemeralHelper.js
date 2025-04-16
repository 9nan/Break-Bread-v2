/**
 * Utility to help with the ephemeral deprecation warning
 * Converts { ephemeral: true } to { flags: MessageFlags.Ephemeral }
 * created by Itznan 
 * Discord = itz._.nan_
 */

const { MessageFlags } = require('discord.js');

/**
 * Convert ephemeral option to use flags instead
 * @param {Object} options - Options object for reply/deferReply 
 * @returns {Object} - Updated options with flags instead of ephemeral
 */
function convertEphemeralToFlags(options) {
    if (!options) return options;
    
    const updatedOptions = { ...options };
    
    if (updatedOptions.ephemeral === true) {
        // Delete the ephemeral property
        delete updatedOptions.ephemeral;
        
        // Set the flag
        updatedOptions.flags = updatedOptions.flags || 0;
        updatedOptions.flags |= MessageFlags.Ephemeral;
    }
    
    return updatedOptions;
}

module.exports = {
    convertEphemeralToFlags
}; 