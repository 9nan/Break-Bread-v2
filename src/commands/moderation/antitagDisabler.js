const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antitagModule = require('./antitag');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antitagdisabler')
        .setDescription('Disable anti-tag protection in your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // Check if antitag is currently enabled
        if (!antitagModule.guildsWithAntitag.has(guildId) || 
            !antitagModule.guildsWithAntitag.get(guildId).enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Already Disabled')
                        .setDescription('Anti-tag protection is already turned off.')
                        .addFields(
                            { name: 'Note', value: 'Use `/antitagenabler` to activate protection' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        // Get current settings
        const settings = antitagModule.guildsWithAntitag.get(guildId);
        settings.enabled = false;
        
        // Save updated settings
        antitagModule.saveAntitagData();
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Anti-Tag Protection Disabled')
            .setDescription('All users can now use @everyone and @here tags in the server.')
            .addFields(
                { name: 'Note', value: 'Your allowed roles list has been preserved for when you re-enable protection.' }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 