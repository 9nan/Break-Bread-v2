/**
 * Help select menu component
 * Shows help information for different categories when selected
 */
const { EmbedBuilder } = require('discord.js');
const cleanLogger = require('../../utils/cleanLogger');

module.exports = {
    id: 'help_menu',
    
    async execute(interaction) {
        try {
            const selectedValue = interaction.values[0];
            cleanLogger.debug(`Help menu option selected: ${selectedValue} by ${interaction.user.tag}`);
            
            let embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });
            
            switch (selectedValue) {
                case 'commands':
                    embed.setTitle('Commands Help')
                        .setDescription('Here are the available commands:')
                        .addFields(
                            { name: '/help', value: 'Shows this help menu' },
                            { name: '/logenable', value: 'Enable server logging' },
                            { name: '/logdisable', value: 'Disable server logging' },
                            { name: '/logsettings', value: 'Configure logging settings' },
                            { name: '/logstats', value: 'View logging statistics' },
                            { name: '/loglevel', value: 'Change bot log level' }
                        );
                    break;
                    
                case 'logging':
                    embed.setTitle('Logging System Help')
                        .setDescription('The logging system records various events in your server:')
                        .addFields(
                            { name: 'Message Events', value: 'Tracks message edits, deletions, etc.' },
                            { name: 'Member Events', value: 'Tracks joins, leaves, bans, etc.' },
                            { name: 'Server Events', value: 'Tracks server setting changes' },
                            { name: 'How To Enable', value: 'Use `/logenable #channel` to start logging' }
                        );
                    break;
                    
                case 'setup':
                    embed.setTitle('Bot Setup Guide')
                        .setDescription('Quick guide to setting up the bot:')
                        .addFields(
                            { name: 'Step 1', value: 'Invite the bot with admin permissions' },
                            { name: 'Step 2', value: 'Use `/logenable #channel` to set up logging' },
                            { name: 'Step 3', value: 'Use `/logsettings` to customize what events are logged' },
                            { name: 'Need Help?', value: 'Contact the bot developer for support' }
                        );
                    break;
                    
                default:
                    embed.setTitle('Help Menu')
                        .setDescription('Please select a category from the dropdown menu');
            }
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            cleanLogger.error('Error executing help menu:', error);
            await interaction.reply({ 
                content: 'There was an error processing your selection!',
                ephemeral: true 
            });
        }
    }
}; 