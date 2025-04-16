const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whois')
        .setDescription('Get information about a user')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('The user to get info about')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const target = interaction.options.getUser('target') || interaction.user;
            const member = interaction.guild.members.cache.get(target.id);

            if (!member) {
                return await interaction.editReply({
                    content: 'Could not find that member in this server.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const roles = member.roles.cache
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, -1); // Remove @everyone

            const embed = new EmbedBuilder()
                .setColor(member.displayHexColor)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setAuthor({
                    name: `User Info - ${target.username}`,
                    iconURL: target.displayAvatarURL()
                })
                .addFields(
                    { name: '🏷️ Username', value: target.username, inline: true },
                    { name: '🆔 ID', value: target.id, inline: true },
                    { name: '📛 Nickname', value: member.nickname || 'None', inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: `🎭 Roles [${roles.length}]`, value: roles.length ? roles.join(', ') : 'None' }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in whois command:', error);
            await interaction.editReply({
                content: '❌ There was an error fetching user information.',
                flags: MessageFlags.Ephemeral
            }).catch(console.error);
        }
    }
};
