const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antilinkModule = require('./antilink');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilinkdisabler')
        .setDescription('Disable anti-link protection in your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // Check if antilink is currently enabled
        if (!antilinkModule.guildsWithAntilink.has(guildId) || 
            !antilinkModule.guildsWithAntilink.get(guildId).enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('Already Disabled')
                        .setDescription('Anti-link protection is already turned off.')
                        .addFields(
                            { name: 'Note', value: 'Use `/antilinkenabler` to activate protection' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ],
                flags: 64
            });
        }
        
        // Get current settings
        const settings = antilinkModule.guildsWithAntilink.get(guildId);
        settings.enabled = false;
        
        // Save updated settings
        antilinkModule.saveAntilinkData();
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Anti-Link Protection Disabled')
            .setDescription('All users can now post links in the server.')
            .addFields(
                { name: 'Note', value: 'Your allowed roles list has been preserved for when you re-enable protection.' }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });
            
        return interaction.reply({ embeds: [embed] });
    }
}; 