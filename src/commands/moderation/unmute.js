const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a member')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({
                content: 'Could not find that member in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!target.manageable) {
            return interaction.reply({
                content: 'I cannot unmute this user. They may have higher permissions than me.',
                flags: MessageFlags.Ephemeral
            });
        }

        const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
        if (!muteRole) {
            return interaction.reply({
                content: 'Could not find the Muted role.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!target.roles.cache.has(muteRole.id)) {
            return interaction.reply({
                content: 'This user is not muted.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await target.roles.remove(muteRole);

            await interaction.reply({
                content: `Unmuted **${target.user.tag}**\nReason: ${reason}`,
                flags: MessageFlags.Ephemeral
            });

            // Try to DM the unmuted user
            try {
                await target.send(`You have been unmuted in **${interaction.guild.name}**\nReason: ${reason}`);
            } catch (error) {
                console.error('Could not DM unmuted user:', error);
            }
        } catch (error) {
            console.error('Error unmuting member:', error);
            await interaction.reply({
                content: 'There was an error unmuting the member.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
