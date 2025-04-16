const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles for a member')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a member')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The member to add the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a member')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The member to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getMember('target');
        const role = interaction.options.getRole('role');

        if (!target) {
            return interaction.reply({
                content: 'Could not find that member in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!role) {
            return interaction.reply({
                content: 'Could not find that role in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                content: 'I cannot manage this role as it is higher than or equal to my highest role.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            if (subcommand === 'add') {
                await target.roles.add(role);
                await interaction.reply({
                    content: `Added the ${role.name} role to ${target.user.tag}`,
                    flags: MessageFlags.Ephemeral
                });
            } else if (subcommand === 'remove') {
                await target.roles.remove(role);
                await interaction.reply({
                    content: `Removed the ${role.name} role from ${target.user.tag}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            console.error('Error managing role:', error);
            await interaction.reply({
                content: 'There was an error managing the role.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
