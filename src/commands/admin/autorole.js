const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const Database = require('../../utils/database');
const config = require('../../../config');

const db = new Database(config.dbPaths.autorole);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage automatic role assignment for new members')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption(option => 
            option
                .setName('action')
                .setDescription('Action to perform on autorole')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' },
                    { name: 'Status', value: 'status' }
                ))
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to automatically assign to new members (only for enable action)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const action = interaction.options.getString('action');
        const botMember = interaction.guild.members.me;

        try {
            if (action === 'enable') {
                const role = interaction.options.getRole('role');
                
                if (!role) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Missing Role')
                                .setDescription('You need to specify a role when enabling autorole.')
                                .addFields(
                                    { name: 'Usage', value: '`/autorole action:Enable role:@RoleName`' }
                                )
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }

                // Check if role is @everyone
                if (role.id === interaction.guild.id) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Invalid Role')
                                .setDescription('You cannot set @everyone as an auto-assigned role.')
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }

                // Check if bot has permission to assign the role
                if (role.position >= botMember.roles.highest.position) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Permission Error')
                                .setDescription(`I cannot assign roles that are positioned higher than or equal to my highest role (${botMember.roles.highest}).`)
                                .addFields(
                                    { name: 'Solution', value: 'Please move my role above the target role in the server settings.' }
                                )
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }

                // Check if role is managed (bot/integration role)
                if (role.managed) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Integration Role')
                                .setDescription('This role is managed by an integration and cannot be manually assigned.')
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }

                // Check if autorole is already set for this guild
                const existingConfig = await db.get(interaction.guild.id);
                if (existingConfig) {
                    const existingRole = interaction.guild.roles.cache.get(existingConfig.roleId);
                    if (existingRole && existingRole.id === role.id) {
                        return interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FFA500')
                                    .setTitle('⚠️ Already Configured')
                                    .setDescription(`Auto role is already configured to assign the ${role} role.`)
                                    .setFooter({ text: 'Auto Role Management' })
                                    .setTimestamp()
                            ]
                        });
                    }
                }

                await db.set(interaction.guild.id, { roleId: role.id });
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Auto Role Enabled')
                            .setDescription(`New members will now automatically receive the ${role} role upon joining.`)
                            .addFields(
                                { name: 'Role', value: `${role.name} (ID: ${role.id})` },
                                { name: 'Members', value: `This will affect all new members joining ${interaction.guild.name}.` }
                            )
                            .setFooter({ text: 'Auto Role Management' })
                            .setTimestamp()
                    ]
                });

            } else if (action === 'disable') {
                const currentRole = await db.get(interaction.guild.id);
                
                if (!currentRole) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('⚠️ Not Configured')
                                .setDescription('Auto role is not currently enabled on this server.')
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }
                
                await db.delete(interaction.guild.id);
                
                const roleObject = interaction.guild.roles.cache.get(currentRole.roleId);
                const roleName = roleObject ? roleObject.name : 'Unknown Role';
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Auto Role Disabled')
                            .setDescription('Automatic role assignment has been disabled.')
                            .addFields(
                                { name: 'Previously Assigned', value: `${roleName} (ID: ${currentRole.roleId})` },
                                { name: 'Note', value: 'New members will no longer receive an automatic role when joining.' }
                            )
                            .setFooter({ text: 'Auto Role Management' })
                            .setTimestamp()
                    ]
                });
            } else if (action === 'status') {
                const currentRole = await db.get(interaction.guild.id);
                
                if (!currentRole) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#0099FF')
                                .setTitle('📊 Auto Role Status')
                                .setDescription('Auto role is currently **disabled** on this server.')
                                .addFields(
                                    { name: 'Enable', value: 'To enable, use `/autorole action:Enable role:@YourRole`' }
                                )
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }
                
                const roleObject = interaction.guild.roles.cache.get(currentRole.roleId);
                
                if (!roleObject) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('⚠️ Configuration Issue')
                                .setDescription(`Auto role is configured but the role (ID: ${currentRole.roleId}) no longer exists.`)
                                .addFields(
                                    { name: 'Recommendation', value: 'Please disable and reconfigure auto role with an existing role.' }
                                )
                                .setFooter({ text: 'Auto Role Management' })
                                .setTimestamp()
                        ]
                    });
                }
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#0099FF')
                            .setTitle('📊 Auto Role Status')
                            .setDescription('Auto role is currently **enabled** on this server.')
                            .addFields(
                                { name: 'Assigned Role', value: `${roleObject.name} (ID: ${roleObject.id})` },
                                { name: 'Role Color', value: roleObject.hexColor },
                                { name: 'Role Position', value: roleObject.position.toString() },
                                { name: 'Managed', value: roleObject.managed ? 'Yes (Integration Role)' : 'No' },
                                { name: 'Created', value: `<t:${Math.floor(roleObject.createdTimestamp / 1000)}:R>` }
                            )
                            .setFooter({ text: 'Auto Role Management' })
                            .setTimestamp()
                    ]
                });
            }

        } catch (error) {
            console.error('Error handling autorole command:', error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ Error')
                        .setDescription('An error occurred while processing your request.')
                        .addFields(
                            { name: 'Details', value: `\`\`\`${error.message}\`\`\`` },
                            { name: 'Action', value: 'Please try again later or contact server administrators if the issue persists.' }
                        )
                        .setFooter({ text: 'Auto Role Management' })
                        .setTimestamp()
                ]
            });
        }
    }
};
