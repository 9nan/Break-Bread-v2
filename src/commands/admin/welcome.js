const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const Database = require('../../utils/database');
const config = require('../../../config');

const db = new Database(config.dbPaths.welcome);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Manage welcome message settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => 
            option
                .setName('action')
                .setDescription('Action to perform on welcome messages')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' },
                    { name: 'Status', value: 'status' }
                ))
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send welcome messages in (only for enable action)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const action = interaction.options.getString('action');

        try {
            if (action === 'enable') {
                const channel = interaction.options.getChannel('channel');
                
                if (!channel) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Missing Channel')
                                .setDescription('You need to specify a channel when enabling welcome messages.')
                                .addFields(
                                    { name: 'Usage', value: '`/welcome action:Enable channel:#channel-name`' }
                                )
                                .setFooter({ text: 'Welcome System' })
                                .setTimestamp()
                        ]
                    });
                }

                if (!channel.isTextBased()) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Invalid Channel')
                                .setDescription('The selected channel must be a text channel.')
                                .setFooter({ text: 'Welcome System' })
                                .setTimestamp()
                        ]
                    });
                }

                // Check if welcome channel is already set for this guild
                const existingConfig = await db.get(interaction.guild.id);
                if (existingConfig && existingConfig.channelId) {
                    const existingChannel = interaction.guild.channels.cache.get(existingConfig.channelId);
                    if (existingChannel) {
                        if (existingChannel.id === channel.id) {
                            return interaction.editReply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor('#FFA500')
                                        .setTitle('⚠️ Already Configured')
                                        .setDescription(`Welcome messages are already configured to send in ${channel}.`)
                                        .setFooter({ text: 'Welcome System' })
                                        .setTimestamp()
                                ]
                            });
                        } else {
                            return interaction.editReply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor('#FFA500')
                                        .setTitle('⚠️ Already Configured')
                                        .setDescription(`Welcome messages are already set to ${existingChannel}.`)
                                        .addFields(
                                            { name: 'Action Required', value: 'Please disable welcome messages first before setting a new channel.' },
                                            { name: 'How to Disable', value: '`/welcome action:Disable`' }
                                        )
                                        .setFooter({ text: 'Welcome System' })
                                        .setTimestamp()
                                ]
                            });
                        }
                    }
                }

                await db.set(interaction.guild.id, { channelId: channel.id });

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Welcome Messages Enabled')
                            .setDescription(`New members will now receive welcome messages in ${channel}.`)
                            .addFields(
                                { name: 'Channel', value: `${channel.name} (ID: ${channel.id})` },
                                { name: 'Members', value: `This will affect all new members joining ${interaction.guild.name}.` }
                            )
                            .setFooter({ text: 'Welcome System' })
                            .setTimestamp()
                    ]
                });
            } else if (action === 'disable') {
                const existingConfig = await db.get(interaction.guild.id);
                
                if (!existingConfig || !existingConfig.channelId) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('⚠️ Not Configured')
                                .setDescription('Welcome messages are not currently enabled on this server.')
                                .setFooter({ text: 'Welcome System' })
                                .setTimestamp()
                        ]
                    });
                }
                
                const existingChannel = interaction.guild.channels.cache.get(existingConfig.channelId);
                const channelName = existingChannel ? existingChannel.name : 'Unknown Channel';
                const channelId = existingConfig.channelId;
                
                await db.delete(interaction.guild.id);
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Welcome Messages Disabled')
                            .setDescription('Welcome messages have been disabled.')
                            .addFields(
                                { name: 'Previously Used', value: `${channelName} (ID: ${channelId})` },
                                { name: 'Note', value: 'New members will no longer receive welcome messages when joining.' }
                            )
                            .setFooter({ text: 'Welcome System' })
                            .setTimestamp()
                    ]
                });
            } else if (action === 'status') {
                const existingConfig = await db.get(interaction.guild.id);
                
                if (!existingConfig || !existingConfig.channelId) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#0099FF')
                                .setTitle('📊 Welcome System Status')
                                .setDescription('Welcome messages are currently **disabled** on this server.')
                                .addFields(
                                    { name: 'Enable', value: 'To enable, use `/welcome action:Enable channel:#channel-name`' }
                                )
                                .setFooter({ text: 'Welcome System' })
                                .setTimestamp()
                        ]
                    });
                }
                
                const existingChannel = interaction.guild.channels.cache.get(existingConfig.channelId);
                
                if (!existingChannel) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('⚠️ Configuration Issue')
                                .setDescription(`Welcome messages are configured but the channel (ID: ${existingConfig.channelId}) no longer exists.`)
                                .addFields(
                                    { name: 'Recommendation', value: 'Please disable and reconfigure welcome messages with an existing channel.' }
                                )
                                .setFooter({ text: 'Welcome System' })
                                .setTimestamp()
                        ]
                    });
                }
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#0099FF')
                            .setTitle('📊 Welcome System Status')
                            .setDescription('Welcome messages are currently **enabled** on this server.')
                            .addFields(
                                { name: 'Channel', value: `${existingChannel.name} (ID: ${existingChannel.id})` },
                                { name: 'Channel Type', value: existingChannel.type.toString() },
                                { name: 'Created', value: `<t:${Math.floor(existingChannel.createdTimestamp / 1000)}:R>` }
                            )
                            .setFooter({ text: 'Welcome System' })
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {
            console.error('Error handling welcome command:', error);
            
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
                        .setFooter({ text: 'Welcome System' })
                        .setTimestamp()
                ]
            });
        }
    }
};
