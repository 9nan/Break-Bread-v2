const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel to prevent members from sending messages')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to lock (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for locking the channel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Save current permissions for @everyone role
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = channel.permissionOverwrites.resolve(everyoneRole.id);
            
            // Lock the channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
            });

            // Send confirmation messages
            await channel.send({
                content: `This channel has been locked by ${interaction.user}.\nReason: ${reason}`
            });

            await interaction.editReply({
                content: `Successfully locked ${channel}.\nReason: ${reason}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in lock command:', error);
            await interaction.editReply({
                content: 'There was an error trying to lock the channel.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
