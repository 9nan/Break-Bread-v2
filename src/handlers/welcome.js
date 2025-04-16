//created by Itznan 
// Discord = itz._.nan_
const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'welcome.json');

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '{}', 'utf8');
}

function getChannelId(guildId) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return data[guildId]?.channelId;
}

async function saveChannelId(guildId, channelId) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    data[guildId] = { channelId };
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function handleWelcomeOnCommand(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel) {
        return await interaction.reply({
            content: '❌ Please specify a valid channel!',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        await saveChannelId(interaction.guildId, channel.id);
        await interaction.reply({
            content: `✅ Welcome messages will now be sent to ${channel}`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error saving welcome channel:', error);
        await interaction.reply({
            content: '❌ There was an error setting up the welcome channel.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleWelcomeOffCommand(interaction) {
    try {
        await saveChannelId(interaction.guildId, null);
        await interaction.reply({
            content: '✅ Welcome messages have been disabled.',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error disabling welcome messages:', error);
        await interaction.reply({
            content: '❌ There was an error disabling welcome messages.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleGuildMemberAdd(member) {
    const channelId = getChannelId(member.guild.id);
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
        await channel.send({
            content: `Welcome ${member} to ${member.guild.name}! 🎉\nWe hope you enjoy your stay!`
        });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
}

module.exports = {
    handleWelcomeOnCommand,
    handleWelcomeOffCommand,
    handleGuildMemberAdd,
    getChannelId
};
