const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Make an announcement')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The announcement message')
                .setRequired(true))
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the announcement to')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content: 'I do not have permission to send messages in that channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await channel.send({
                content: message,
                allowedMentions: { parse: ['users', 'roles'] }
            });

            await interaction.reply({
                content: `Announcement sent successfully in ${channel}!`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error sending announcement:', error);
            await interaction.reply({
                content: 'There was an error sending the announcement.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
