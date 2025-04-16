const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
// const logger = require('../../utils/cleanLogger');
const { createCanvas } = require('canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hex')
        .setDescription('Generate a color from a hex code')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The hex color code (e.g. #FF5733)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get the hex code from the options
            let hexCode = interaction.options.getString('code');
            
            // Validate and clean the hex code
            if (!hexCode.startsWith('#')) {
                hexCode = '#' + hexCode;
            }
            
            // Basic validation of hex code format
            const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexRegex.test(hexCode)) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('Invalid Hex Code')
                            .setDescription('Please provide a valid hex color code (e.g. #FF5733 or FF5733)')
                    ]
                });
                return;
            }
            
            // For 3-digit hex codes, convert to 6-digit format
            if (hexCode.length === 4) {
                hexCode = '#' + hexCode[1] + hexCode[1] + hexCode[2] + hexCode[2] + hexCode[3] + hexCode[3];
            }
            
            // Generate the color image
            const colorImage = await generateColorImage(hexCode);
            
            // Create an attachment with the color image
            const attachment = new AttachmentBuilder(colorImage, { name: 'color.png' });
            
            // Create the embed with information about the color
            const embed = new EmbedBuilder()
                .setColor(hexCode)
                .setTitle(`Color: ${hexCode.toUpperCase()}`)
                .setDescription('Here\'s your color preview!')
                .setImage('attachment://color.png')
                .setTimestamp();
            
            // Send the response with the color preview
            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });
            
            // Log stats occasionally (10% chance)
            if (Math.random() < 0.1) {
                // logger.debug(`Generated color preview for ${hexCode}`);
            }
        } catch (error) {
            // logger.error('Error in hex command:', error);
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription('Failed to generate color preview. Please try again later.')
                ]
            });
        }
    }
};

async function generateColorImage(hexCode) {
    // Create a canvas for the color preview
    const canvas = createCanvas(300, 200);
    const ctx = canvas.getContext('2d');
    
    // Fill the canvas with the specified color
    ctx.fillStyle = hexCode;
    ctx.fillRect(0, 0, 300, 200);
    
    // Add a label with the hex code
    ctx.fillStyle = getContrastingTextColor(hexCode);
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hexCode.toUpperCase(), 150, 100);
    
    // Return the canvas as a buffer
    return canvas.toBuffer();
}

function getContrastingTextColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text on dark backgrounds, black text on light backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}