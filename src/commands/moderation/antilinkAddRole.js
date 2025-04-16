const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antilinkModule = require('./antilink');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilinkaddrole')
        .setDescription('Add a role to allowed roles for posting links')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role to allow posting links')
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
        
        // Check if role is already in the allowed list
        if (settings.allowedRoles.has(role.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Already Allowed')
                        .setDescription(`${role} already has permission to post links.`)
                        .addFields(
                            { name: 'Current Roles', value: `• ${antilinkModule.formatRolesList(settings.allowedRoles)}` }
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
        antilinkModule.saveAntilinkData();
        
        // Create a new embed to show success
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Role Added')
            .setDescription(`${role} can now post links in the server.`)
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