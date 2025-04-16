//created by Itznan 
// Discord = itz._.nan_


const fs = require('fs');
const { MessageFlags } = require('discord.js');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'autorole.json');

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '{}', 'utf8');
}

function getRoleId(guildId) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return data[guildId]?.roleId;
}

async function saveRoleId(guildId, roleId) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    data[guildId] = { roleId };
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function disableAutorole(guildId) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    delete data[guildId];
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function handleAutoroleEnableCommand(interaction, options) {
    const role = options.getRole('role');
    
    if (!role) {
        return await interaction.reply({
            content: '❌ Please specify a valid role!',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        await saveRoleId(interaction.guildId, role.id);
        await interaction.reply({
            content: `✅ Autorole has been enabled. New members will receive the ${role} role.`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error enabling autorole:', error);
        await interaction.reply({
            content: '❌ There was an error enabling autorole.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleAutoroleDisableCommand(interaction) {
    try {
        await disableAutorole(interaction.guildId);
        await interaction.reply({
            content: '✅ Autorole has been disabled.',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error disabling autorole:', error);
        await interaction.reply({
            content: '❌ There was an error disabling autorole.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleGuildMemberAdd(member) {
    const roleId = getRoleId(member.guild.id);
    if (!roleId) return;

    const role = member.guild.roles.cache.get(roleId);
    if (!role) return;

    try {
        await member.roles.add(role);
    } catch (error) {
        console.error('Error adding autorole:', error);
    }
}

module.exports = {
    handleAutoroleEnableCommand,
    handleAutoroleDisableCommand,
    handleGuildMemberAdd,
    getRoleId
};
