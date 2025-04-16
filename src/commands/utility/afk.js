const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { convertEphemeralToFlags } = require('../../utils/ephemeralHelper');
const fs = require('fs');
const path = require('path');
const config = require('../../../config');

// Store AFK users with their status and timestamp
// This will be overwritten on bot restart, but it's a memory-based solution that works for now
// For a more persistent solution, you would want to use a database
const afkUsers = new Map();
const afkDataPath = config.dbPaths.afk;

// Ensure data directory exists
try {
    const dataDir = path.dirname(afkDataPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Load existing AFK data if available
    if (fs.existsSync(afkDataPath)) {
        const afkData = JSON.parse(fs.readFileSync(afkDataPath, 'utf8'));
        for (const [userId, userData] of Object.entries(afkData)) {
            afkUsers.set(userId, userData);
        }
        console.log(`Loaded ${afkUsers.size} AFK user records from storage`);
    }
} catch (error) {
    console.error('Error loading AFK data:', error);
}

// Save AFK data to file
function saveAfkData() {
    try {
        const afkData = Object.fromEntries(afkUsers.entries());
        fs.writeFileSync(afkDataPath, JSON.stringify(afkData, null, 2));
    } catch (error) {
        console.error('Error saving AFK data:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status')
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for going AFK')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.user;
        const reason = interaction.options.getString('reason') || 'AFK';
        const timestamp = Date.now();

        try {
            // Set user as AFK
            afkUsers.set(user.id, {
                reason: reason,
                timestamp: timestamp
            });

            // Save updated AFK data
            saveAfkData();

            // Add (AFK) to nickname if possible
            if (interaction.member?.manageable) {
                const currentNick = interaction.member.nickname || interaction.member.user.username;
                if (!currentNick.endsWith('(AFK)')) {
                    try {
                        // Ensure nickname with (AFK) doesn't exceed Discord's 32 character limit
                        const newNick = `${currentNick} (AFK)`.substring(0, 32);
                        console.log(`Attempting to change nickname for ${user.tag}:`);
                        console.log(`Current nickname: ${currentNick}`);
                        console.log(`New nickname: ${newNick}`);
                        console.log(`Bot permissions: ${interaction.guild.members.me.permissions.has('ManageNicknames')}`);
                        console.log(`Member manageable: ${interaction.member.manageable}`);
                        
                        await interaction.member.setNickname(newNick);
                        console.log('Nickname change successful');
                    } catch (error) {
                        console.error('Failed to update nickname:', error);
                        console.error('Error details:', {
                            code: error.code,
                            message: error.message,
                            stack: error.stack
                        });
                    }
                } else {
                    console.log('Nickname already has (AFK) suffix');
                }
            } else {
                
            }

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`I've set your AFK status: ${reason}`);

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in AFK command:', error);
            
            // Check if the interaction is still valid
            if (interaction.isRepliable()) {
                await interaction.reply(convertEphemeralToFlags({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('Error')
                            .setDescription('An error occurred while updating your AFK status. Please try again later.')
                    ],
                    ephemeral: true
                })).catch(e => console.error('Failed to send error response:', e));
            }
        }
    },

    // Export the afkUsers map so it can be accessed by the messageCreate event
    afkUsers: afkUsers,
    saveAfkData: saveAfkData
};
