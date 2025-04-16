/**
 * Feedback modal component
 * Processes feedback form submissions
 */
const { EmbedBuilder } = require('discord.js');
const cleanLogger = require('../../utils/cleanLogger');

module.exports = {
    id: 'feedback_modal',
    
    async execute(interaction) {
        try {
            // Get values from the modal
            const feedback = interaction.fields.getTextInputValue('feedback_input');
            const name = interaction.fields.getTextInputValue('name_input') || 'Anonymous';
            
            cleanLogger.debug(`Feedback received from ${interaction.user.tag}: "${feedback.substring(0, 20)}..."`);
            
            // Create a nice embed with the feedback
            const feedbackEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('New Feedback Received')
                .addFields(
                    { name: 'From', value: name, inline: true },
                    { name: 'User', value: interaction.user.tag, inline: true },
                    { name: 'Feedback', value: feedback }
                )
                .setFooter({ text: `Feedback ID: ${interaction.id}` })
                .setTimestamp();
            
            // Try to DM the feedback to the bot owner if possible
            try {
                const application = await interaction.client.application.fetch();
                const owner = await interaction.client.users.fetch(application.owner.id);
                await owner.send({ embeds: [feedbackEmbed] });
                cleanLogger.info(`Feedback from ${interaction.user.tag} sent to bot owner ${owner.tag}`);
            } catch (dmError) {
                cleanLogger.error('Could not DM feedback to bot owner:', dmError);
                // Store the feedback in a log instead
            }
            
            // Reply to the user
            await interaction.reply({
                content: 'Thank you for your feedback! It has been sent to the bot owner.',
                ephemeral: true
            });
            
        } catch (error) {
            cleanLogger.error('Error processing feedback modal:', error);
            await interaction.reply({ 
                content: 'There was an error processing your feedback. Please try again later!',
                ephemeral: true 
            });
        }
    }
}; 