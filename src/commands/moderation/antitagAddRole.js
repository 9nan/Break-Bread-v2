const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antitagModule = require('./antitag');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antitagaddrole')
        .setDescription('Add a role to allowed roles for using @everyone/@here tags')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role to allow using restricted tags')
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
        
        // Check if role is already in the allowed list
        if (settings.allowedRoles.has(role.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Already Allowed')
                        .setDescription(`${role} already has permission to use restricted tags.`)
                        .addFields(
                            { name: 'Current Roles', value: `• ${antitagModule.formatRolesList(settings.allowedRoles)}` }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        // Add the role to the allowed roles list
        settings.allowedRoles.add(role.id);
        
        // Save updated settings
        antitagModule.saveAntitagData();
        
        // Create a new embed to show success
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Role Added')
            .setDescription(`${role} can now use @everyone and @here tags in the server.`)
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