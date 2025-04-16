const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for banning'))
        .addNumberOption(option =>
            option
                .setName('days')
                .setDescription('Number of days of messages to delete')
                .setMinValue(0)
                .setMaxValue(7))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the ban via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Defer the reply immediately to give us more time to process
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target') || 
                       await interaction.guild.members.fetch(interaction.options.getUser('target').id).catch(() => null);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getNumber('days') || 0;
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        
        // Get the user object even if member is not in guild
        const user = interaction.options.getUser('target');

        // Check if target is valid
        if (!user) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Ban Failed')
                        .setDescription('Please specify a valid user to ban.')
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
                        .setTitle('❌ Ban Failed')
                        .setDescription('You cannot ban yourself.')
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
                        .setTitle('❌ Ban Failed')
                        .setDescription('You cannot ban the server owner.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if target is already banned
        try {
            const banList = await interaction.guild.bans.fetch();
            if (banList.has(user.id)) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('⚠️ User Already Banned')
                            .setDescription(`${user.tag} is already banned from this server.`)
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ]
                });
            }
        } catch (error) {
            console.error('Error checking ban list:', error);
        }

        // Check if member can be banned (only if they're in the guild)
        if (target && !target.bannable) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Ban Failed')
                        .setDescription(`I cannot ban ${user.tag}. They may have higher permissions than me.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Confirm Ban')
            .setDescription(`Are you sure you want to ban ${user.tag}?`)
            .addFields(
                { name: '📝 Reason', value: reason },
                { name: '🗑️ Message Deletion', value: `${days} day(s)` },
                { name: '📧 DM Notification', value: notify ? 'Will be sent' : 'Will not be sent' }
            )
            .setTimestamp()
            .setFooter({ text: 'Moderation System' });

        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_ban')
            .setLabel('Confirm Ban')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_ban')
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
            if (i.customId === 'cancel_ban') {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Ban Cancelled')
                            .setDescription('The ban operation has been cancelled.')
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ],
                    components: []
                });
                return;
            }

            if (i.customId === 'confirm_ban') {
                try {
                    // Notify user before ban (if requested and member is in guild)
                    if (notify && target) {
                        try {
                            await target.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor('#FF0000')
                                        .setTitle(`🔨 Banned from ${interaction.guild.name}`)
                                        .setDescription(`You have been banned from ${interaction.guild.name}.`)
                                        .addFields(
                                            { name: '📝 Reason', value: reason },
                                            { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                        )
                                        .setTimestamp()
                                        .setFooter({ text: 'Moderation System' })
                                ]
                            });
                        } catch (error) {
                            console.warn(`Could not DM ban notification to ${user.tag}:`, error);
                        }
                    }

                    // Ban the user
                    const deleteSeconds = days * 86400;
                    await interaction.guild.members.ban(user.id, { 
                        deleteMessageSeconds: deleteSeconds, 
                        reason: `${reason} - Banned by ${interaction.user.tag} (${interaction.user.id})` 
                    });

                    // Create success embed
                    const banEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔨 User Banned')
                        .setDescription(`Successfully banned ${user.tag} (${user.id})`)
                        .addFields(
                            { name: '📝 Reason', value: reason },
                            { name: '🗑️ Message Deletion', value: `${days} day(s)` },
                            { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Moderator: ${interaction.user.tag}` });

                    // Update the message
                    await i.update({
                        embeds: [banEmbed],
                        components: []
                    });

                    // Log the ban to a moderation log channel if one exists
                    try {
                        const logChannel = interaction.guild.channels.cache.find(
                            channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                        );
                        
                        if (logChannel && logChannel.isTextBased()) {
                            await logChannel.send({ embeds: [banEmbed] });
                        }
                    } catch (logError) {
                        console.error('Error logging ban to mod-logs channel:', logError);
                    }
                } catch (error) {
                    console.error('Error banning user:', error);
                    
                    // Send error message
                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Ban Failed')
                                .setDescription(`There was an error banning ${user.tag}.`)
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
                            .setTitle('❌ Ban Cancelled')
                            .setDescription('The ban operation timed out. Please try again.')
                            .setTimestamp()
                            .setFooter({ text: 'Moderation System' })
                    ],
                    components: []
                });
            }
        });
    }
};
