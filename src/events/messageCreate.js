/**
 * Message creation event handler
 * Created by itznan 2025
 */
//created by Itznan 
// Discord = itz._.nan_

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const afkCommand = require('../commands/utility/afk');
const afkUsers = afkCommand.afkUsers;
const saveAfkData = afkCommand.saveAfkData;
// const logger = require('../utils/cleanLogger');
// Import the antilink module
const antilinkModule = require('../commands/moderation/antilink');
const guildsWithAntilink = antilinkModule.guildsWithAntilink;
// Import the antitag module
const antitagModule = require('../commands/moderation/antitag');
const guildsWithAntitag = antitagModule.guildsWithAntitag;

// Format time difference into a readable string
function formatTimeDifference(timestamp) {
    const now = Date.now();
    const diffInMinutes = Math.floor((now - timestamp) / 60000);
    
    if (diffInMinutes < 1) return 'less than a minute';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
}

// Helper function to check channel permissions
async function canSendMessages(channel) {
    try {
        const botMember = channel.guild.members.me;
        if (!botMember) {
            // logger.warn('Bot member not found in guild');
            return false;
        }

        const permissions = channel.permissionsFor(botMember);
        if (!permissions) {
            // logger.warn('Could not fetch permissions for channel');
            return false;
        }

        const requiredPermissions = [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.EmbedLinks
        ];

        const missingPermissions = requiredPermissions.filter(perm => !permissions.has(perm));
        if (missingPermissions.length > 0) {
            // logger.warn(`Missing permissions in channel ${channel.id}: ${missingPermissions.map(p => PermissionsBitField.Flags[p]).join(', ')}`);
            return false;
        }

        return true;
    } catch (error) {
        // logger.error('Error checking channel permissions:', error);
        return false;
    }
}

// Helper function to safely send messages with permission checks
async function safeSendMessage(channel, content) {
    try {
        const hasPermissions = await canSendMessages(channel);
        if (!hasPermissions) {
            // logger.warn(`Cannot send message in channel ${channel.id} due to missing permissions`);
            return false;
        }

        // Log the attempt to send message
        // logger.info(`Attempting to send message in channel ${channel.id}`);
        
        await channel.send(content);
        // logger.info(`Successfully sent message in channel ${channel.id}`);
        return true;
    } catch (error) {
        if (error.code === 50013) {
            // logger.warn(`Missing permissions in channel ${channel.id}: ${error.message}`);
        } else {
            // logger.error('Error sending message:', error);
        }
        return false;
    }
}

// Helper function to detect URLs in a message
function containsUrl(text) {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    return urlPattern.test(text);
}

// Check if user is allowed to post links
function isAllowedToPostLinks(member, guildId) {
    if (!guildsWithAntilink.has(guildId) || !guildsWithAntilink.get(guildId).enabled) {
        return true; // Antilink is not enabled, all users can post links
    }

    const settings = guildsWithAntilink.get(guildId);
    
    // Check if the user has any of the allowed roles
    return Array.from(settings.allowedRoles).some(roleId => member.roles.cache.has(roleId));
}

// Check if user is allowed to use @everyone and @here tags
function isAllowedToUseRestrictedTags(member, guildId) {
    if (!guildsWithAntitag.has(guildId) || !guildsWithAntitag.get(guildId).enabled) {
        return true; // Antitag is not enabled, all users can use tags
    }

    const settings = guildsWithAntitag.get(guildId);
    
    // Check if the user has any of the allowed roles
    return Array.from(settings.allowedRoles).some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            if (message.author.bot) return;

            // Check if antitag is enabled for this guild and if message contains @everyone or @here
            if (message.guild && (message.content.includes('@everyone') || message.content.includes('@here'))) {
                const guildId = message.guild.id;
                const member = message.member;
                
                if (!isAllowedToUseRestrictedTags(member, guildId)) {
                    // User is not allowed to use restricted tags
                    try {
                        // Delete the message
                        await message.delete();
                        // logger.info(`Deleted message with restricted tag from ${message.author.tag} in ${message.guild.name}`);
                        
                        // Send warning to the user via DM instead of in the channel
                        const warningEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Tag Detected')
                            .setDescription(`Your message containing @everyone or @here has been deleted in ${message.guild.name}. You don't have permission to use these tags in this server.`)
                            .setTimestamp()
                            .setFooter({ text: 'Anti-Tag Protection' });
                        
                        try {
                            // Send DM to the user
                            await message.author.send({ embeds: [warningEmbed] });
                            // logger.info(`Sent warning DM to ${message.author.tag} about deleted restricted tag`);
                        } catch (dmError) {
                            // If DM fails (user has DMs closed), send ephemeral message in channel if possible
                            // logger.warn(`Could not send DM to ${message.author.tag}: ${dmError.message}`);
                            // No channel message as it would be visible to everyone
                        }
                        
                        // Apply timeout if configured
                        const settings = guildsWithAntitag.get(guildId);
                        if (settings.timeout > 0 && member.moderatable) {
                            try {
                                await member.timeout(
                                    settings.timeout * 60 * 1000, 
                                    'Automatic timeout for using restricted tags without permission'
                                );
                                
                                // logger.info(`Applied timeout to ${message.author.tag} for ${settings.timeout} minutes in ${message.guild.name}`);
                                
                                // Inform about the timeout
                                const timeoutEmbed = new EmbedBuilder()
                                    .setColor('#FF8C00')
                                    .setTitle('Timeout Applied')
                                    .setDescription(`${message.author} has been timed out for ${settings.timeout} minute${settings.timeout === 1 ? '' : 's'} for using restricted tags without permission.`)
                                    .setTimestamp()
                                    .setFooter({ text: 'Anti-Tag Protection' });
                                
                                await safeSendMessage(message.channel, { embeds: [timeoutEmbed] });
                            } catch (error) {
                                // logger.error(`Failed to timeout user ${message.author.tag}:`, error);
                            }
                        }
                    } catch (error) {
                        // logger.error(`Error handling antitag for message from ${message.author.tag}:`, error);
                    }
                    
                    // Skip the rest of the message processing
                    return;
                }
            }

            // Check if antilink is enabled for this guild and if message contains URLs
            if (message.guild && containsUrl(message.content)) {
                const guildId = message.guild.id;
                const member = message.member;
                
                if (!isAllowedToPostLinks(member, guildId)) {
                    // User is not allowed to post links
                    try {
                        // Delete the message
                        await message.delete();
                        // logger.info(`Deleted message with link from ${message.author.tag} in ${message.guild.name}`);
                        
                        // Send warning to the user via DM instead of in the channel
                        const warningEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Link Detected')
                            .setDescription(`Your message containing a link has been deleted in ${message.guild.name}. You don't have permission to send links in this server.`)
                            .setTimestamp()
                            .setFooter({ text: 'Anti-Link Protection' });
                        
                        try {
                            // Send DM to the user
                            await message.author.send({ embeds: [warningEmbed] });
                            // logger.info(`Sent warning DM to ${message.author.tag} about deleted link`);
                        } catch (dmError) {
                            // If DM fails (user has DMs closed), send ephemeral message in channel if possible
                            // logger.warn(`Could not send DM to ${message.author.tag}: ${dmError.message}`);
                            // No channel message as it would be visible to everyone
                        }
                        
                        // Apply timeout if configured
                        const settings = guildsWithAntilink.get(guildId);
                        if (settings.timeout > 0 && member.moderatable) {
                            try {
                                await member.timeout(
                                    settings.timeout * 60 * 1000, 
                                    'Automatic timeout for sending links without permission'
                                );
                                
                                // logger.info(`Applied timeout to ${message.author.tag} for ${settings.timeout} minutes in ${message.guild.name}`);
                                
                                // Inform about the timeout
                                const timeoutEmbed = new EmbedBuilder()
                                    .setColor('#FF8C00')
                                    .setTitle('⏱️ Timeout Applied')
                                    .setDescription(`${message.author} has been timed out for ${settings.timeout} minute${settings.timeout === 1 ? '' : 's'} for sending links without permission.`)
                                    .setTimestamp()
                                    .setFooter({ text: 'Anti-Link Protection' });
                                
                                await safeSendMessage(message.channel, { embeds: [timeoutEmbed] });
                            } catch (error) {
                                // logger.error(`Failed to timeout user ${message.author.tag}:`, error);
                            }
                        }
                    } catch (error) {
                        // logger.error(`Error handling antilink for message from ${message.author.tag}:`, error);
                    }
                    
                    // Skip the rest of the message processing
                    return;
                }
            }

            // Check if the message author was AFK
            if (afkUsers.has(message.author.id)) {
                const afkInfo = afkUsers.get(message.author.id);
                afkUsers.delete(message.author.id);
                
                // Save updated AFK data
                saveAfkData();
                
                // Try to remove (AFK) from nickname if it exists
                if (message.member?.manageable) {
                    const currentNick = message.member.nickname || message.member.user.username;
                    if (currentNick.endsWith('(AFK)')) {
                        try {
                            const newNick = currentNick.replace(/ \(AFK\)$/, '');
                            await message.member.setNickname(newNick === '' ? null : newNick);
                        } catch (error) {
                            // logger.error('Failed to update nickname:', error);
                        }
                    }
                }

                // Send welcome back message
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(`👋 Welcome back, ${message.author}! I've removed your AFK status.`);

                await safeSendMessage(message.channel, { embeds: [welcomeEmbed] });
            }

            // Check for mentions of AFK users
            const mentionedUsers = message.mentions.users;
            for (const [userId, user] of mentionedUsers) {
                if (afkUsers.has(userId)) {
                    const afkInfo = afkUsers.get(userId);
                    const timeAgo = formatTimeDifference(afkInfo.timestamp);
                    
                    const mentionEmbed = new EmbedBuilder()
                        .setColor('#ff9900')
                        .setDescription(`${user} is currently AFK: ${afkInfo.reason}\nThey've been AFK for ${timeAgo}`);

                    await safeSendMessage(message.channel, { embeds: [mentionEmbed] });
                }
            }
        } catch (error) {
            // logger.error('Error in messageCreate event:', error);
        }
    }
};
