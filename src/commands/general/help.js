/**
 * Help command that displays interactive components
 */
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, EmbedBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
const cleanLogger = require('../../utils/cleanLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information and interactive components'),

    async execute(interaction) {
        try {
            // Create the help embed
            const helpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Bot Help')
                .setDescription('Here\'s how to use this bot. Select a category from the dropdown menu or use the buttons below.')
                .addFields(
                    { name: 'Logging Commands', value: 'Use `/logenable` to start logging events to a channel' },
                    { name: 'Need More Help?', value: 'Use the dropdown menu below to see specific help topics or click the Info button' }
                )
                .setFooter({ text: 'This help menu has interactive components!' })
                .setTimestamp();

            // Create a button row
            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('info_button')
                        .setLabel('Bot Info')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('ℹ️'),
                    new ButtonBuilder()
                        .setLabel('Website')
                        .setURL('https://example.com')
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId('feedback_button')
                        .setLabel('Give Feedback')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📝')
                );

            // Create a select menu
            const selectRow = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('help_menu')
                        .setPlaceholder('Select a help topic')
                        .addOptions([
                            {
                                label: 'Commands',
                                description: 'List of all commands',
                                value: 'commands',
                                emoji: '🤖'
                            },
                            {
                                label: 'Logging System',
                                description: 'Information about the logging system',
                                value: 'logging',
                                emoji: '📄'
                            },
                            {
                                label: 'Setup Guide',
                                description: 'Guide to setting up the bot',
                                value: 'setup',
                                emoji: '🔧'
                            }
                        ])
                );

            // Send the response with components
            await interaction.reply({
                embeds: [helpEmbed],
                components: [selectRow, buttonRow]
            });

            // Create a feedback modal for when the feedback button is clicked
            const feedbackModal = new ModalBuilder()
                .setCustomId('feedback_modal')
                .setTitle('Send Feedback');

            // Add inputs to the modal
            const nameInput = new TextInputBuilder()
                .setCustomId('name_input')
                .setLabel('Your Name (Optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Enter your name or leave blank to remain anonymous');

            const feedbackInput = new TextInputBuilder()
                .setCustomId('feedback_input')
                .setLabel('Your Feedback')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Please enter your feedback, suggestions, or report any issues you\'ve found')
                .setMaxLength(1000);

            // Add inputs to the modal
            const nameRow = new ActionRowBuilder().addComponents(nameInput);
            const feedbackRow = new ActionRowBuilder().addComponents(feedbackInput);
            feedbackModal.addComponents(nameRow, feedbackRow);

            // Set up a collector for the feedback button
            const message = await interaction.fetchReply();
            const collector = message.createMessageComponentCollector({ time: 3600000 }); // 1 hour

            collector.on('collect', async i => {
                cleanLogger.debug(`Component interaction: ${i.customId} by ${i.user.tag}`);
                
                // Only allow the original user to use components
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: 'Sorry, only the person who used the command can use these buttons.', ephemeral: true });
                    return;
                }

                // Handle the feedback button separately
                if (i.customId === 'feedback_button') {
                    await i.showModal(feedbackModal);
                    return;
                }

                // Let the component handler manage the other components
                // The help_menu and info_button will be handled by their respective files
            });

            collector.on('end', () => {
                cleanLogger.debug(`Help command component collector ended for ${interaction.user.tag}`);
            });

        } catch (error) {
            cleanLogger.error('Error executing help command:', error);
            await interaction.reply({ 
                content: 'There was an error showing the help menu!',
                ephemeral: true 
            });
        }
    }
}; 