/**
 * Interaction event handler
 * Processes all Discord interactions (commands, buttons, select menus, modals)
 */
//created by Itznan 
// Discord = itz._.nan_

const { Events, InteractionType } = require('discord.js');
const { MessageFlags } = require('discord.js');
const { convertEphemeralToFlags } = require('../utils/ephemeralHelper');

// Use the global logger
// const cleanLogger = require('../utils/cleanLogger');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        try {
            // Command interactions
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                
                if (!command) {
                    // Use the global logger
                    // cleanLogger.warn(`No command found for ${interaction.commandName}`);
                    return interaction.reply({ 
                        content: 'This command doesn\'t exist or has been disabled.', 
                        ephemeral: true 
                    });
                }
                
                try {
                    await command.execute(interaction);
                    // Use the global logger
                    // cleanLogger.debug(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
                } catch (error) {
                    // Use the global logger
                    // cleanLogger.error(`Error executing command ${interaction.commandName}:`, error);
                    
                    const errorMessage = { 
                        content: 'There was an error executing this command.', 
                        ephemeral: true 
                    };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
                return;
            }
            
            // Button interactions
            if (interaction.isButton()) {
                // Use the global logger
                // cleanLogger.debug(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
                await interaction.client.componentHandler.handleButton(interaction);
                return;
            }
            
            // Select menu interactions
            if (interaction.isStringSelectMenu()) {
                // Use the global logger
                // cleanLogger.debug(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
                await interaction.client.componentHandler.handleSelectMenu(interaction);
                return;
            }
            
            // Modal submit interactions
            if (interaction.isModalSubmit()) {
                // Use the global logger
                // cleanLogger.debug(`Modal submission: ${interaction.customId} by ${interaction.user.tag}`);
                await interaction.client.componentHandler.handleModal(interaction);
                return;
            }
            
            // Context menu interactions
            if (interaction.isContextMenuCommand()) {
                const contextCommand = interaction.client.contextCommands?.get(interaction.commandName);
                
                if (!contextCommand) {
                    // Use the global logger
                    // cleanLogger.warn(`No context command found for ${interaction.commandName}`);
                    return interaction.reply({ 
                        content: 'This context command doesn\'t exist or has been disabled.', 
                        ephemeral: true 
                    });
                }
                
                try {
                    await contextCommand.execute(interaction);
                    // Use the global logger
                    // cleanLogger.debug(`Context command executed: ${interaction.commandName} by ${interaction.user.tag}`);
                } catch (error) {
                    // Use the global logger
                    // cleanLogger.error(`Error executing context command ${interaction.commandName}:`, error);
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ 
                            content: 'There was an error executing this context command.', 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: 'There was an error executing this context command.', 
                            ephemeral: true 
                        });
                    }
                }
            }
        } catch (error) {
            // Use the global logger
            // cleanLogger.error('Unhandled error in interaction create event:', error);
        }
    }
};
