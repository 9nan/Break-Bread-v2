const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antilinkModule = require('./antilink');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilinkremoverole')
        .setDescription('Remove a role from allowed roles for posting links')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role to remove permission from')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const role = interaction.options.getRole('role');
        
        // Check if antilink is enabled for this guild
        if (!antilinkModule.guildsWithAntilink.has(guildId) || 
            !antilinkModule.guildsWithAntilink.get(guildId).enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Error: Anti-Link Not Enabled')
                        .setDescription('Anti-link protection is not currently active.')
                        .addFields(
                            { name: 'Solution', value: 'First enable Anti-Link protection with `/antilinkenabler`' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        const settings = antilinkModule.guildsWithAntilink.get(guildId);
        
        // Check if role is in the allowed list
        if (!settings.allowedRoles.has(role.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Role Not Found')
                        .setDescription(`${role} is not in the allowed roles list.`)
                        .addFields(
                            { name: 'Current Allowed Roles', value: `• ${antilinkModule.formatRolesList(settings.allowedRoles)}` }
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
                        .setDescription('At least one role must be allowed to post links.')
                        .addFields(
                            { name: 'Solution', value: 'First add another allowed role with `/antilinkaddrole`, or disable Anti-Link protection with `/antilinkdisabler`' }
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
        antilinkModule.saveAntilinkData();
        
        // Create a new embed to show success
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Role Removed')
            .setDescription(`${role} can no longer post links in the server.`)
            .addFields(
                { 
                    name: 'Current Allowed Roles', 
                    value: `• ${antilinkModule.formatRolesList(settings.allowedRoles)}` 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 