const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antitagModule = require('./antitag');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antitagremoverole')
        .setDescription('Remove a role from allowed roles for using @everyone/@here tags')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role to remove permission from')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const role = interaction.options.getRole('role');
        
        // Check if antitag is enabled for this guild
        if (!antitagModule.guildsWithAntitag.has(guildId) || 
            !antitagModule.guildsWithAntitag.get(guildId).enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Error: Anti-Tag Not Enabled')
                        .setDescription('Anti-tag protection is not currently active.')
                        .addFields(
                            { name: 'Solution', value: 'First enable Anti-Tag protection with `/antitagenabler`' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        const settings = antitagModule.guildsWithAntitag.get(guildId);
        
        // Check if role is in the allowed list
        if (!settings.allowedRoles.has(role.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Role Not Found')
                        .setDescription(`${role} is not in the allowed roles list.`)
                        .addFields(
                            { name: 'Current Allowed Roles', value: `• ${antitagModule.formatRolesList(settings.allowedRoles)}` }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        // Check if this is the last allowed role
        if (settings.allowedRoles.size === 1) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Cannot Remove Last Role')
                        .setDescription('At least one role must be allowed to use restricted tags.')
                        .addFields(
                            { name: 'Solution', value: 'First add another allowed role with `/antitagaddrole`, or disable Anti-Tag protection with `/antitagdisabler`' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        // Remove the role from the allowed roles list
        settings.allowedRoles.delete(role.id);
        
        // Save updated settings
        antitagModule.saveAntitagData();
        
        // Create a new embed to show success
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Role Removed')
            .setDescription(`${role} can no longer use @everyone and @here tags in the server.`)
            .addFields(
                { 
                    name: 'Current Allowed Roles', 
                    value: `• ${antitagModule.formatRolesList(settings.allowedRoles)}` 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 