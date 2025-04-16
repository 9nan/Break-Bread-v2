const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servercount')
        .setDescription('Display the number of servers the bot is in'),

    async execute(interaction) {
        const serverCount = interaction.client.guilds.cache.size;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📊 Server Statistics')
            .addFields(
                { name: '🌍 Servers', value: `**${serverCount}**`, inline: true }
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}; 