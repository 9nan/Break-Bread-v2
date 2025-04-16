const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set the slowmode for the current channel')
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Slowmode duration in seconds (0 to disable)')
                .setMinValue(0)
                .setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            // Check if user has permission to manage channels
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.reply({
                    content: 'You do not have permission to manage slowmode.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check if the bot has permission to manage channels
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.reply({
                    content: 'I do not have permission to manage slowmode in this channel.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Get slowmode duration & validate input
            const duration = interaction.options.getInteger('duration') || 0;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await interaction.channel.setRateLimitPerUser(duration);
            
            const response = duration === 0
                ? 'Slowmode has been disabled.'
                : `Slowmode has been set to ${duration} seconds.`;

            await interaction.editReply({
                content: response,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error setting slowmode:', error);
            const errorResponse = {
                content: 'There was an error setting the slowmode.',
                flags: MessageFlags.Ephemeral
            };
            
            if (interaction.deferred) {
                await interaction.editReply(errorResponse);
            } else {
                await interaction.reply(errorResponse);
            }
        }
    }
};
