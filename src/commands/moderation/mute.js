const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member in the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for muting')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Duration of the mute in minutes (0 for indefinite)')
                .setMinValue(0))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the mute via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason');
        const duration = interaction.options.getInteger('duration') || 0; // Default to 0 (indefinite)
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        const user = interaction.options.getUser('target');

        // Error handling if target doesn't exist
        if (!target) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Mute Failed')
                        .setDescription('Please specify a valid member to mute. This user may not be in the server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if user is trying to mute themself
        if (target.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Mute Failed')
                        .setDescription('You cannot mute yourself.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if the bot can manage roles
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Mute Failed')
                        .setDescription('I don\'t have permission to manage roles in this server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if moderator has sufficient permissions compared to target
        if (target.roles.highest.position >= interaction.member.roles.highest.position && 
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Mute Failed')
                        .setDescription(`You cannot mute ${user.tag} as they have a higher or equal role position.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        try {
            // Find or create mute role
            let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');

            if (!muteRole) {
                // Create status embed to inform about role creation
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('⏳ Creating Mute Role')
                            .setDescription('A "Muted" role doesn\'t exist, creating one now...')
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ]
                });

                try {
                    // Create the mute role
                    muteRole = await interaction.guild.roles.create({
                        name: 'Muted',
                        color: '#808080',
                        reason: 'Created for the mute command'
                    });

                    // Update all channels' permissions for the mute role
                    await Promise.all(interaction.guild.channels.cache.map(async channel => {
                        await channel.permissionOverwrites.create(muteRole, {
                            SendMessages: false,
                            AddReactions: false,
                            Speak: false
                        });
                    }));
                } catch (roleError) {
                    console.error('Error creating mute role:', roleError);
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Mute Failed')
                                .setDescription('Unable to create the Muted role. Please check my permissions or create it manually.')
                                .addFields(
                                    { name: '🔧 Error Details', value: `\`\`\`${roleError.message}\`\`\`` }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ]
                    });
                }
            }

            // Notify user before muting (if requested)
            if (notify) {
                try {
                    const durationText = duration > 0 
                        ? `for ${duration} minute${duration === 1 ? '' : 's'}` 
                        : 'indefinitely';
                    
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle(`🔇 Muted in ${interaction.guild.name}`)
                                .setDescription(`You have been muted in ${interaction.guild.name} ${durationText}.`)
                                .addFields(
                                    { name: '📝 Reason', value: reason },
                                    { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ]
                    });
                } catch (dmError) {
                    console.warn(`Could not DM mute notification to ${user.tag}:`, dmError);
                }
            }

            // Apply mute role to target
            await target.roles.add(muteRole, `Muted by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`);

            // Set timeout if duration is specified
            let timeoutInfo = 'No timeout set (indefinite mute)';
            if (duration > 0 && interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                try {
                    const timeoutDuration = duration * 60 * 1000; // Convert minutes to milliseconds
                    await target.timeout(timeoutDuration, reason);
                    timeoutInfo = `Discord timeout set for ${duration} minute${duration === 1 ? '' : 's'}`;
                } catch (timeoutError) {
                    console.warn(`Could not set timeout for ${user.tag}:`, timeoutError);
                    timeoutInfo = 'Failed to set Discord timeout, using role mute only';
                }
            }

            // Create success embed
            const muteEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔇 Member Muted')
                .setDescription(`Successfully muted ${user.tag} (${user.id})`)
                .addFields(
                    { name: '📝 Reason', value: reason },
                    { name: '⏱️ Duration', value: duration > 0 ? `${duration} minute${duration === 1 ? '' : 's'}` : 'Indefinite' },
                    { name: '🔄 Timeout Status', value: timeoutInfo },
                    { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                )
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });

            // Send success message
            await interaction.editReply({ embeds: [muteEmbed] });

            // Log the mute to a moderation log channel if one exists
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                );
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ embeds: [muteEmbed] });
                }
            } catch (logError) {
                console.error('Error logging mute to mod-logs channel:', logError);
            }
        } catch (error) {
            console.error('Error muting member:', error);
            
            // Send error message
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Mute Failed')
                        .setDescription(`There was an error muting ${user.tag}.`)
                        .addFields(
                            { name: '🔧 Error Details', value: `\`\`\`${error.message}\`\`\`` }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }
    }
};
