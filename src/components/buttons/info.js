/**
 * Info button component
 * Simple button that shows bot information when clicked
 */
const { EmbedBuilder } = require('discord.js');
const cleanLogger = require('../../utils/cleanLogger');

module.exports = {
    id: 'info_button',
    
    async execute(interaction) {
        try {
            cleanLogger.debug(`Info button clicked by ${interaction.user.tag}`);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Bot Information')
                .setDescription('This is a Discord bot with a custom logging system!')
                .addFields(
                    { name: 'Owner', value: 'Your Name', inline: true },
                    { name: 'Version', value: '1.0.0', inline: true },
                    { name: 'Library', value: 'discord.js', inline: true },
                    { name: 'Commands', value: `${interaction.client.commands?.size || 0} commands available` },
                    { name: 'Uptime', value: `${Math.round(interaction.client.uptime / 60000)} minutes` }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();
                
            await interaction.reply({ 
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            cleanLogger.error('Error executing info button:', error);
            await interaction.reply({ 
                content: 'There was an error processing your request!',
                ephemeral: true 
            });
        }
    }
}; 