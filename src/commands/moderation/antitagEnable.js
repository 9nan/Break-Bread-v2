const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antitagModule = require('./antitag');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antitagenabler')
        .setDescription('Enable anti-tag protection in your server')
        .addRoleOption(option =>
            option
                .setName('allowed_role')
                .setDescription('Role that is allowed to tag everyone/here')
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
        
        // If antitag already exists for this guild, preserve existing allowed roles
        const existingRoles = new Set();
        if (antitagModule.guildsWithAntitag.has(guildId)) {
            const existing = antitagModule.guildsWithAntitag.get(guildId);
            // Copy over existing roles if there are any
            if (existing.allowedRoles && existing.allowedRoles.size > 0) {
                existing.allowedRoles.forEach(roleId => existingRoles.add(roleId));
            }
        }
        
        // Add the new role
        existingRoles.add(role.id);
        
        // Create or update settings for this guild
        antitagModule.guildsWithAntitag.set(guildId, {
            enabled: true,
            allowedRoles: existingRoles,
            timeout: timeout
        });
        
        // Save updated settings
        antitagModule.saveAntitagData();
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Anti-Tag Protection Enabled')
            .setDescription('Members without allowed roles will not be able to tag @everyone or @here.')
            .addFields(
                { 
                    name: 'Allowed Roles', 
                    value: `• ${antitagModule.formatRolesList(existingRoles)}` 
                },
                { 
                    name: 'Timeout Setting', 
                    value: timeout > 0 
                        ? `${timeout} minute${timeout === 1 ? '' : 's'}` 
                        : 'No automatic timeout' 
                },
                {
                    name: 'Next Steps',
                    value: 'Use `/antitagaddrole` to add more allowed roles\nUse `/antitagstatus` to check status anytime'
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 