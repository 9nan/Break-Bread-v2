const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the server'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const { guild } = interaction;
            
            // Get channel counts by type using the ChannelType enum
            const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
            const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
            const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
            const announcementChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
            const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;
            
            // Format verification level
            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium',
                3: 'High',
                4: 'Very High'
            };
            
            // Format server boost level
            const boostLevels = {
                0: 'None',
                1: 'Level 1',
                2: 'Level 2',
                3: 'Level 3'
            };
            
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${guild.name} - Server Info`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }) || '')
                .addFields(
                    { name: "Server ID", value: `\`${guild.id}\``, inline: true },
                    { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
                    { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                    { name: "Members", value: `**${guild.memberCount}**`, inline: true },
                    { name: "Verification Level", value: `**${verificationLevels[guild.verificationLevel] || 'Unknown'}**`, inline: true },
                    { name: "Roles", value: `**${guild.roles.cache.size}**`, inline: true },
                    { 
                        name: "Channels", 
                        value: `**Total:** ${guild.channels.cache.size}\n**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categoryChannels}`,
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add additional channel types if they exist
            const additionalChannels = [];
            if (forumChannels > 0) additionalChannels.push(`**Forums:** ${forumChannels}`);
            if (announcementChannels > 0) additionalChannels.push(`**Announcements:** ${announcementChannels}`);
            if (stageChannels > 0) additionalChannels.push(`**Stages:** ${stageChannels}`);
            
            if (additionalChannels.length > 0) {
                embed.addFields({ 
                    name: "Additional Channels", 
                    value: additionalChannels.join('\n'),
                    inline: true 
                });
            }
            
            // Add emoji info if there are any emojis
            if (guild.emojis.cache.size > 0) {
                embed.addFields({ 
                    name: "Emojis", 
                    value: `**Total:** ${guild.emojis.cache.size}\n**Regular:** ${guild.emojis.cache.filter(e => !e.animated).size}\n**Animated:** ${guild.emojis.cache.filter(e => e.animated).size}`,
                    inline: true 
                });
            }
            
            // Add boost information
            embed.addFields(
                { 
                    name: "Boost Status", 
                    value: `**Level:** ${boostLevels[guild.premiumTier] || 'None'}\n**Count:** ${guild.premiumSubscriptionCount || 0}`,
                    inline: true 
                }
            );
            
            // Add server features if any are available
            if (guild.features.length > 0) {
                const features = guild.features.map(feature => 
                    feature.toLowerCase()
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                );
                
                if (features.length > 0) {
                    embed.addFields({ 
                        name: "Server Features", 
                        value: features.slice(0, 6).join('\n') + (features.length > 6 ? `\n*and ${features.length - 6} more...*` : ''),
                        inline: false 
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in serverinfo command:', error);
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Error')
                        .setDescription('There was an error fetching server information.')
                ],
                flags: MessageFlags.Ephemeral
            }).catch(e => console.error('Failed to send error response:', e));
        }
    }
};