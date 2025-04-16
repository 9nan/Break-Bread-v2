const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for kicking'))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the kick via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        
        // Get the user object for display purposes
        const user = interaction.options.getUser('target');

        if (!target) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kick Failed')
                        .setDescription('Please specify a valid member to kick. This user may not be in the server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check for self-moderation
        if (user.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kick Failed')
                        .setDescription('You cannot kick yourself.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check for server owner
        if (user.id === interaction.guild.ownerId) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kick Failed')
                        .setDescription('You cannot kick the server owner.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if member can be kicked
        if (!target.kickable) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kick Failed')
                        .setDescription(`I cannot kick ${user.tag}. They may have higher permissions than me.`)
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
                        .setTitle('❌ Kick Failed')
                        .setDescription(`You cannot kick ${user.tag} as they have a higher or equal role position.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Confirm Kick')
            .setDescription(`Are you sure you want to kick ${user.tag}?`)
            .addFields(
                { name: '📝 Reason', value: reason },
                { name: '📧 DM Notification', value: notify ? 'Will be sent' : 'Will not be sent' }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });

        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_kick')
            .setLabel('Confirm Kick')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_kick')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        // Send confirmation message
        const confirmMessage = await interaction.editReply({
            embeds: [confirmEmbed],
            components: [row]
        });

        // Create button collector
        const filter = i => i.user.id === interaction.user.id;
        const collector = confirmMessage.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'cancel_kick') {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Kick Cancelled')
                            .setDescription('The kick operation has been cancelled.')
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ],
                    components: []
                });
                return;
            }

            if (i.customId === 'confirm_kick') {
                try {
                    // Notify user before kick (if requested)
                    if (notify) {
                        try {
                            await target.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor('#FFA500')
                                        .setTitle(`👢 Kicked from ${interaction.guild.name}`)
                                        .setDescription(`You have been kicked from ${interaction.guild.name}.`)
                                        .addFields(
                                            { name: '📝 Reason', value: reason },
                                            { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                        )
                                        .setTimestamp()
                                        .setFooter({ text: 'Moderation System' })
                                ]
                            });
                        } catch (error) {
                            console.warn(`Could not DM kick notification to ${user.tag}:`, error);
                        }
                    }

                    // Kick the member
                    await target.kick(`${reason} - Kicked by ${interaction.user.tag} (${interaction.user.id})`);

                    // Create success embed
                    const kickEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('👢 Member Kicked')
                        .setDescription(`Successfully kicked ${user.tag} (${user.id})`)
                        .addFields(
                            { name: '📝 Reason', value: reason },
                            { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Moderator: ${interaction.user.tag}` });

                    // Update the message
                    await i.update({
                        embeds: [kickEmbed],
                        components: []
                    });

                    // Log the kick to a moderation log channel if one exists
                    try {
                        const logChannel = interaction.guild.channels.cache.find(
                            channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                        );
                        
                        if (logChannel && logChannel.isTextBased()) {
                            await logChannel.send({ embeds: [kickEmbed] });
                        }
                    } catch (logError) {
                        console.error('Error logging kick to mod-logs channel:', logError);
                    }
                } catch (error) {
                    console.error('Error kicking member:', error);
                    
                    // Send error message
                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Kick Failed')
                                .setDescription(`There was an error kicking ${user.tag}.`)
                                .addFields(
                                    { name: '🔧 Error Details', value: `\`\`\`${error.message}\`\`\`` }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ],
                        components: []
                    });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Kick Cancelled')
                            .setDescription('The kick operation timed out. Please try again.')
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ],
                    components: []
                });
            }
        });
    }
};
