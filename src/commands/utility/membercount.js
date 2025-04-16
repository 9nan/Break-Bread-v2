const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Display the total member count across all servers where the bot is present'),

    async execute(interaction) {
        const client = interaction.client;
        
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalServers = client.guilds.cache.size;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🌍 Global Member Count')
            .addFields(
                { name: '🏠 Total Servers', value: `${totalServers}`, inline: true },
                { name: '👥 Total Members', value: `${totalMembers}`, inline: true }
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
