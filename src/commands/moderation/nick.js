const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Change a member\'s nickname')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to change nickname for')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('nickname')
                .setDescription('The new nickname (leave empty to remove)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const nickname = interaction.options.getString('nickname');

        if (!target) {
            return interaction.reply({
                content: 'Could not find that member in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!target.manageable) {
            return interaction.reply({
                content: 'I cannot modify this user\'s nickname. They may have higher permissions than me.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await target.setNickname(nickname || null);
            await interaction.reply({
                content: nickname
                    ? `Changed ${target.user.tag}'s nickname to "${nickname}"`
                    : `Removed ${target.user.tag}'s nickname`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error changing nickname:', error);
            await interaction.reply({
                content: 'There was an error changing the nickname.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
