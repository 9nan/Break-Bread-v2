const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antilinkModule = require('./antilink');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilinkenabler')
        .setDescription('Enable anti-link protection in your server')
        .addRoleOption(option =>
            option
                .setName('allowed_role')
                .setDescription('Role that is allowed to post links')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('timeout')
                .setDescription('Timeout duration in minutes (0 for no timeout)')
                .setMinValue(0)
                .setMaxValue(10080))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const role = interaction.options.getRole('allowed_role');
        const timeout = interaction.options.getInteger('timeout') || 0;
        
        // If antilink already exists for this guild, preserve existing allowed roles
        const existingRoles = new Set();
        if (antilinkModule.guildsWithAntilink.has(guildId)) {
            const existing = antilinkModule.guildsWithAntilink.get(guildId);
            // Copy over existing roles if there are any
            if (existing.allowedRoles && existing.allowedRoles.size > 0) {
                existing.allowedRoles.forEach(roleId => existingRoles.add(roleId));
            }
        }
        
        // Add the new role
        existingRoles.add(role.id);
        
        // Create or update settings for this guild
        antilinkModule.guildsWithAntilink.set(guildId, {
            enabled: true,
            allowedRoles: existingRoles,
            timeout: timeout
        });
        
        // Save updated settings
        antilinkModule.saveAntilinkData();
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Anti-Link Protection Enabled')
            .setDescription('Members without allowed roles will not be able to post links.')
            .addFields(
                { 
                    name: 'Allowed Roles', 
                    value: `• ${antilinkModule.formatRolesList(existingRoles)}` 
                },
                { 
                    name: 'Timeout Setting', 
                    value: timeout > 0 
                        ? `${timeout} minute${timeout === 1 ? '' : 's'}` 
                        : 'No automatic timeout' 
                },
                {
                    name: 'Next Steps',
                    value: 'Use `/antilinkaddrole` to add more allowed roles\nUse `/antilinkstatus` to check status anytime'
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 