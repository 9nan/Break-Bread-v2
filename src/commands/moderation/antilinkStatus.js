const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antilinkModule = require('./antilink');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilinkstatus')
        .setDescription('Check the current anti-link protection status')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // Check if antilink is configured for this guild
        if (!antilinkModule.guildsWithAntilink.has(guildId) || 
            !antilinkModule.guildsWithAntilink.get(guildId).enabled) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Anti-Link Protection')
                .setDescription('**Status: Disabled**\n\nLinks can be posted by anyone in this server.')
                .addFields(
                    { name: 'How to Enable', value: 'Use `/antilinkenabler` to set up link protection' }
                )
                .setTimestamp()
                .setFooter({ text: 'Moderation System' });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Get current settings
        const settings = antilinkModule.guildsWithAntilink.get(guildId);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Anti-Link Protection')
            .setDescription('**Status: Enabled**\n\nLinks can only be posted by members with allowed roles.')
            .addFields(
                { 
                    name: 'Allowed Roles', 
                    value: `• ${antilinkModule.formatRolesList(settings.allowedRoles) || 'None'}` 
                },
                { 
                    name: 'Timeout Settings', 
                    value: settings.timeout > 0 
                        ? `Members without allowed roles will be timed out for ${settings.timeout} minute${settings.timeout === 1 ? '' : 's'} if they post a link.` 
                        : 'No automatic timeout is applied for violations.'
                },
                {
                    name: 'Quick Commands',
                    value: '`/antilinkdisabler` - Turn off protection\n`/antilinkaddrole` - Add allowed role\n`/antilinkremoverole` - Remove allowed role'
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 