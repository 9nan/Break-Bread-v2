const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel to allow members to send messages')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to unlock (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for unlocking the channel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Get @everyone role
            const everyoneRole = interaction.guild.roles.everyone;
            
            // Unlock the channel by resetting SendMessages permission
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                SendMessagesInThreads: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null
            });

            // Send confirmation messages
            await channel.send({
                content: `🔓 This channel has been unlocked by ${interaction.user}.\nReason: ${reason}`
            });

            await interaction.editReply({
                content: `Successfully unlocked ${channel}.\nReason: ${reason}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in unlock command:', error);
            await interaction.editReply({
                content: 'There was an error trying to unlock the channel.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
