const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to remove timeout from')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for removing timeout'))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the timeout removal via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        const user = interaction.options.getUser('target');

        // Error handling if target doesn't exist
        if (!target) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Untimeout Failed')
                        .setDescription('Please specify a valid member to remove timeout from. This user may not be in the server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if the bot has permission to manage the user
        if (!target.moderatable) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Untimeout Failed')
                        .setDescription(`I cannot modify ${user.tag}. They may have higher permissions than me.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if the user is actually timed out
        if (!target.communicationDisabledUntil) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Untimeout Failed')
                        .setDescription(`${user.tag} is not currently timed out.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        try {
            // Notify user about timeout removal (if requested)
            if (notify) {
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle(`🔊 Timeout Removed in ${interaction.guild.name}`)
                                .setDescription(`Your timeout in ${interaction.guild.name} has been removed.`)
                                .addFields(
                                    { name: '📝 Reason', value: reason },
                                    { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ]
                    });
                } catch (dmError) {
                    console.warn(`Could not DM untimeout notification to ${user.tag}:`, dmError);
                }
            }

            // Remove timeout from target
            await target.timeout(null, `Timeout removed by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`);

            // Create success embed
            const untimeoutEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Timeout Removed')
                .setDescription(`Successfully removed timeout from ${user.tag} (${user.id})`)
                .addFields(
                    { name: '📝 Reason', value: reason },
                    { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                )
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });

            // Send success message
            await interaction.editReply({ embeds: [untimeoutEmbed] });

            // Log the untimeout to a moderation log channel if one exists
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                );
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ embeds: [untimeoutEmbed] });
                }
            } catch (logError) {
                console.error('Error logging untimeout to mod-logs channel:', logError);
            }
        } catch (error) {
            console.error('Error removing timeout:', error);
            
            // Send error message
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Untimeout Failed')
                        .setDescription(`There was an error removing timeout from ${user.tag}.`)
                        .addFields(
                            { name: '🔧 Error Details', value: `\`\`\`${error.message}\`\`\`` }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }
    }
}; 