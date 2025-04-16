const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Bans and immediately unbans a member to clear their messages')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to softban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for softbanning'))
        .addNumberOption(option =>
            option
                .setName('days')
                .setDescription('Number of days of messages to delete')
                .setMinValue(1)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Defer the reply immediately to give us more time to process
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getNumber('days') || 1;

        if (!target) {
            return interaction.reply({
                content: 'Could not find that member in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if the bot can ban the target
        if (!target.bannable) {
            return interaction.reply({
                content: 'I cannot softban that member. They may have higher permissions than me.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if the user has permission to ban the target
        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: 'You cannot softban someone with an equal or higher role.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // Save user information before banning
            const userId = target.user.id;
            const userTag = target.user.tag;
            const guildName = interaction.guild.name;
            const guildIcon = interaction.guild.iconURL({ dynamic: true });
            const inviteLink = await createServerInvite(interaction.guild);

            // Try to send a DM to the user before softbanning
            try {
                const dmEmbed = {
                    title: `You've been softbanned from ${guildName}`,
                    description: `You have been temporarily banned to remove your recent messages.`,
                    color: 0xFF9900, // Orange color
                    fields: [
                        {
                            name: 'Reason',
                            value: reason
                        },
                        {
                            name: 'Messages Deleted',
                            value: `Last ${days} day(s) of messages`
                        },
                        {
                            name: 'Rejoin Server',
                            value: `You can rejoin the server immediately using this link:\n${inviteLink || 'Ask a server member for an invite link.'}`
                        }
                    ],
                    timestamp: new Date(),
                    footer: {
                        text: `Softbanned by ${interaction.user.tag}`
                    }
                };

                if (guildIcon) {
                    dmEmbed.thumbnail = { url: guildIcon };
                }

                await target.user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log(`Could not send DM to ${target.user.tag}: ${dmError}`);
                // Continue with softban even if DM fails
            }

            // Ban the member
            await target.ban({
                deleteMessageSeconds: days * 86400,
                reason: `Softban by ${interaction.user.tag} | Reason: ${reason}`
            });

            // Immediately unban them
            await interaction.guild.members.unban(userId, 
                `Softban removal by ${interaction.user.tag} | Original reason: ${reason}`
            );

            await interaction.editReply({
                content: `Successfully softbanned ${userTag}\nReason: ${reason}\nMessages deleted: ${days} day(s)\nUser was notified and can rejoin the server.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in softban command:', error);
            await interaction.editReply({
                content: 'There was an error trying to softban that member.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

// Helper function to create a server invite
async function createServerInvite(guild) {
    try {
        // Try to find a system channel or the first text channel with create invite permissions
        const channel = guild.systemChannel || 
            guild.channels.cache.find(channel => 
                channel.type === 0 && // GUILD_TEXT
                channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)
            );
        
        if (!channel) return null;
        
        // Create an invite that doesn't expire
        const invite = await channel.createInvite({
            maxAge: 0, // never expires
            maxUses: 0, // unlimited uses
            unique: true,
            reason: 'Created for softban rejoin'
        });
        
        return invite.url;
    } catch (error) {
        console.error('Error creating invite:', error);
        return null;
    }
}
