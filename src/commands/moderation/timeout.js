const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member for a specified duration')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Timeout duration in minutes')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)) // Max 28 days
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for timeout'))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the timeout via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        const user = interaction.options.getUser('target');

        // Error handling if target doesn't exist
        if (!target) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Timeout Failed')
                        .setDescription('Please specify a valid member to timeout. This user may not be in the server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if user is trying to timeout themself
        if (target.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Timeout Failed')
                        .setDescription('You cannot timeout yourself.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if the bot can timeout the user
        if (!target.moderatable) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Timeout Failed')
                        .setDescription(`I cannot timeout ${user.tag}. They may have higher permissions than me.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if moderator has sufficient permissions compared to target
        if (target.roles.highest.position >= interaction.member.roles.highest.position && 
            interaction.member.id !== interaction.guild.ownerId) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Timeout Failed')
                        .setDescription(`You cannot timeout ${user.tag} as they have a higher or equal role position.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        try {
            // Notify user before timeout (if requested)
            if (notify) {
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle(`🔇 Timed Out in ${interaction.guild.name}`)
                                .setDescription(`You have been timed out in ${interaction.guild.name} for ${duration} minute${duration === 1 ? '' : 's'}.`)
                                .addFields(
                                    { name: '📝 Reason', value: reason },
                                    { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ]
                    });
                } catch (dmError) {
                    console.warn(`Could not DM timeout notification to ${user.tag}:`, dmError);
                }
            }

            // Apply timeout to target
            await target.timeout(duration * 60 * 1000, `Timed out by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`);

            // Create success embed
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔇 Member Timed Out')
                .setDescription(`Successfully timed out ${user.tag} (${user.id})`)
                .addFields(
                    { name: '📝 Reason', value: reason },
                    { name: '⏱️ Duration', value: `${duration} minute${duration === 1 ? '' : 's'}` },
                    { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                )
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });

            // Send success message
            await interaction.editReply({ embeds: [timeoutEmbed] });

            // Log the timeout to a moderation log channel if one exists
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                );
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ embeds: [timeoutEmbed] });
                }
            } catch (logError) {
                console.error('Error logging timeout to mod-logs channel:', logError);
            }
        } catch (error) {
            console.error('Error timing out member:', error);
            
            // Send error message
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Timeout Failed')
                        .setDescription(`There was an error timing out ${user.tag}.`)
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