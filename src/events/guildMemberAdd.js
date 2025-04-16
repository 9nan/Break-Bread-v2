//created by Itznan 
// Discord = itz._.nan_
const Database = require('../utils/database');
const config = require('../../config');
const { EmbedBuilder } = require('discord.js');

const autoroleDb = new Database(config.dbPaths.autorole);
const welcomeDb = new Database(config.dbPaths.welcome);

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const botMember = await member.guild.members.fetchMe();

            // Handle auto role
            const autoroleData = await autoroleDb.get(member.guild.id);
            if (autoroleData?.roleId) {
                try {
                    const role = await member.guild.roles.fetch(autoroleData.roleId);
                    if (role && botMember.roles.highest.position > role.position) {
                        await member.roles.add(role);
                        console.log(`✅ Assigned auto role "${role.name}" to ${member.user.tag}`);
                    } else {
                        console.warn(`⚠️ Bot lacks permission to assign the role "${role?.name}" in ${member.guild.name}`);

                        // DM the server owner using MAIN bot (not backup)
                        try {
                            const owner = await member.guild.fetchOwner();
                            await owner.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('🚫 Permission Issue Detected')
                                        .setDescription(
                                            `The bot couldn't assign the role **${role?.name}** in **${member.guild.name}**.\n\n` +
                                            'Make sure the bot\'s role is **above the target role** and it has **Manage Roles** permission.'
                                        )
                                        .setColor('Red')
                                        .setFooter({ text: 'Automated alert from your server bot' })
                                        .setTimestamp()
                                ]
                            });
                            console.log(`📬 Sent permission warning DM to ${owner.user.tag}`);
                        } catch (dmError) {
                            console.error(`❌ Failed to DM ${member.guild.name}'s owner:`, dmError);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error assigning auto role in ${member.guild.name}:`, error);
                }
            }

            // Handle welcome message
            const welcomeData = await welcomeDb.get(member.guild.id);
            if (welcomeData?.channelId) {
                try {
                    const channel = await member.guild.channels.fetch(welcomeData.channelId);
                    if (channel?.isTextBased()) {
                        await channel.send({
                            content: `> Hey ${member}, welcome to our server **"${member.guild.name}"**\n>\n> Please read the rules and have fun!`,
                            files: [
                                {
                                    attachment: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
                                    name: 'avatar.png'
                                }
                            ]
                        });
                        console.log(`📨 Welcome message sent in #${channel.name} for ${member.user.tag}`);
                    } else {
                        console.warn(`⚠️ Welcome channel is not a text channel in ${member.guild.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Error sending welcome message in ${member.guild.name}:`, error);
                }
            }
        } catch (error) {
            console.error(`❌ Critical error handling guildMemberAdd in ${member.guild.name}:`, error);
        }
    }
};
