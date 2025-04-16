const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    cooldown: 20, // 20 second cooldown to prevent spam
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a specified number of messages')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for purging messages'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
                
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Check if user has permission to delete messages
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Purge Failed')
                        .setDescription('You do not have permission to delete messages.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if bot has permission to delete messages
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Purge Failed')
                        .setDescription('I do not have permission to delete messages.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Validate message amount
        if (amount < 1 || amount > 100) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Purge Failed')
                        .setDescription('Please provide a number between **1 and 100** for messages to delete.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        try {
            // Fetch and delete messages
            const messages = await interaction.channel.bulkDelete(amount, true);
            
            // Create success embed
            const purgeEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🧹 Messages Purged')
                .setDescription(`Successfully deleted ${messages.size} message${messages.size === 1 ? '' : 's'}.`)
                .addFields(
                    { name: '📝 Reason', value: reason },
                    { name: '📢 Channel', value: `<#${interaction.channelId}>` }
                )
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });
            
            // Send success message
            await interaction.editReply({ 
                embeds: [purgeEmbed],
                flags: MessageFlags.Ephemeral
            });
            
            // Log the purge to a moderation log channel if one exists
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                );
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ embeds: [purgeEmbed] });
                }
            } catch (logError) {
                console.error('Error logging purge to mod-logs channel:', logError);
            }
        } catch (error) {
            console.error('Error purging messages:', error);
            
            let errorMessage = 'There was an error deleting messages.';
            
            // Provide more specific error messages for common issues
            if (error.code === 50034) {
                errorMessage = 'Messages older than 14 days cannot be bulk deleted.';
            }
            
            // Send error message
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Purge Failed')
                        .setDescription(errorMessage)
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