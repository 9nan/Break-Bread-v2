const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antitagModule = require('./antitag');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antitagstatus')
        .setDescription('Check the current anti-tag protection status')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // Check if antitag is configured for this guild
        if (!antitagModule.guildsWithAntitag.has(guildId) || 
            !antitagModule.guildsWithAntitag.get(guildId).enabled) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Anti-Tag Protection')
                .setDescription('**Status: Disabled**\n\nEveryone/here tags can be used by anyone in this server.')
                .addFields(
                    { name: 'How to Enable', value: 'Use `/antitagenabler` to set up tag protection' }
                )
                .setTimestamp()
                .setFooter({ text: 'Moderation System' });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Get current settings
        const settings = antitagModule.guildsWithAntitag.get(guildId);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Anti-Tag Protection')
            .setDescription('**Status: Enabled**\n\n@everyone and @here tags can only be used by members with allowed roles.')
            .addFields(
                { 
                    name: 'Allowed Roles', 
                    value: `• ${antitagModule.formatRolesList(settings.allowedRoles) || 'None'}` 
                },
                { 
                    name: 'Timeout Settings', 
                    value: settings.timeout > 0 
                        ? `Members without allowed roles will be timed out for ${settings.timeout} minute${settings.timeout === 1 ? '' : 's'} if they use restricted tags.` 
                        : 'No automatic timeout is applied for violations.'
                },
                {
                    name: 'Quick Commands',
                    value: '`/antitagdisabler` - Turn off protection\n`/antitagaddrole` - Add allowed role\n`/antitagremoverole` - Remove allowed role'
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 