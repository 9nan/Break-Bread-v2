const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const Database = require('../../utils/database.js');
const warningsDB = new Database('warnings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member for rule violations')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('notify')
                .setDescription('Notify the user about the warning via DM'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason');
        const notify = interaction.options.getBoolean('notify') ?? true; // Default to true if not specified
        const user = interaction.options.getUser('target');
        
        // Initialize warnings database if needed
        await warningsDB.init();

        // Error handling if target doesn't exist
        if (!target) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Warning Failed')
                        .setDescription('Please specify a valid member to warn. This user may not be in the server.')
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        // Check if user is trying to warn themself
        if (target.id === interaction.user.id) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Warning Failed')
                        .setDescription('You cannot warn yourself.')
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
                        .setTitle('❌ Warning Failed')
                        .setDescription(`You cannot warn ${user.tag} as they have a higher or equal role position.`)
                        .setTimestamp()
                        .setFooter({ text: 'Moderation System' })
                ]
            });
        }

        try {
            // Get existing warnings or create new entry
            const guildWarnings = warningsDB.get(interaction.guild.id) || {};
            const userWarnings = guildWarnings[target.id] || [];
            
            // Create new warning object
            const newWarning = {
                id: userWarnings.length + 1,
                reason: reason,
                moderator: interaction.user.id,
                moderatorTag: interaction.user.tag,
                timestamp: new Date().toISOString()
            };
            
            // Add warning to user's record
            userWarnings.push(newWarning);
            guildWarnings[target.id] = userWarnings;
            warningsDB.set(interaction.guild.id, guildWarnings);
            await warningsDB.save();
            
            // Notify user if enabled
            if (notify) {
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle(`⚠️ Warning in ${interaction.guild.name}`)
                                .setDescription(`You have received a warning in ${interaction.guild.name}.`)
                                .addFields(
                                    { name: '📝 Reason', value: reason },
                                    { name: '🔢 Warning Number', value: `#${newWarning.id}` },
                                    { name: '👮‍♂️ Moderator', value: interaction.user.tag }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Moderation System' })
                        ]
                    });
                } catch (dmError) {
                    console.warn(`Could not DM warning notification to ${user.tag}:`, dmError);
                }
            }
            
            // Create success embed
            const warnEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Member Warned')
                .setDescription(`Successfully warned ${user.tag} (${user.id})`)
                .addFields(
                    { name: '📝 Reason', value: reason },
                    { name: '🔢 Warning Count', value: `${userWarnings.length}` },
                    { name: '📧 DM Notification', value: notify ? 'Sent' : 'Not sent' }
                )
                .setTimestamp()
                .setFooter({ text: `Moderator: ${interaction.user.tag}` });
            
            // Send success message
            await interaction.editReply({ embeds: [warnEmbed] });
            
            // Log the warning to a moderation log channel if one exists
            try {
                const logChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
                );
                
                if (logChannel && logChannel.isTextBased()) {
                    await logChannel.send({ embeds: [warnEmbed] });
                }
            } catch (logError) {
                console.error('Error logging warning to mod-logs channel:', logError);
            }
        } catch (error) {
            console.error('Error warning member:', error);
            
            // Send error message
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Warning Failed')
                        .setDescription(`There was an error warning ${user.tag}.`)
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
