const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Category descriptions for better context
const CATEGORY_DESCRIPTIONS = {
    admin: '🔐 Administrative commands for server management',
    fun: '🎮 Fun and entertainment commands',
    moderation: '🛡️ Commands for moderating the server',
    music: '🎵 Music playback and control commands',
    utility: '🔧 Useful utility commands'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Specific command category to show')
                .setRequired(false)
                .addChoices(
                    { name: 'Admin', value: 'admin' },
                    { name: 'Fun', value: 'fun' },
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Music', value: 'music' },
                    { name: 'Utility', value: 'utility' }
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const category = interaction.options.getString('category');
            const commandsPath = path.join(__dirname, '..');
            
            // Get all command folders dynamically
            const commandFolders = fs.readdirSync(commandsPath)
                .filter(folder => fs.statSync(path.join(commandsPath, folder)).isDirectory());

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 Command Help Menu')
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setThumbnail(interaction.client.user.displayAvatarURL());

            if (category) {
                const categoryPath = path.join(commandsPath, category);
                if (!fs.existsSync(categoryPath)) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Category Not Found')
                                .setDescription(`No commands found in the "${category}" category.`)
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Get commands in the selected category
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
                
                if (commandFiles.length === 0) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ No Commands')
                                .setDescription(`No commands found in the "${category}" category.`)
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                // Get commands info and sort alphabetically
                const categoryCommands = commandFiles
                    .map(file => {
                        try {
                            const command = require(path.join(categoryPath, file));
                            if (command.data?.name && command.data?.description) {
                                const options = command.data.options?.length 
                                    ? ` *(${command.data.options.length} option${command.data.options.length !== 1 ? 's' : ''})*` 
                                    : '';
                                    
                                return {
                                    name: command.data.name,
                                    description: command.data.description,
                                    options: options,
                                    permissions: command.data.default_member_permissions
                                };
                            }
                            return null;
                        } catch (err) {
                            console.error(`Error loading command ${file}:`, err);
                            return null;
                        }
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
                const categoryEmoji = Object.keys(CATEGORY_DESCRIPTIONS).includes(category) 
                    ? CATEGORY_DESCRIPTIONS[category].split(' ')[0] 
                    : '📁';
                
                embed.setTitle(`${categoryEmoji} ${categoryTitle} Commands`)
                    .setDescription(`${CATEGORY_DESCRIPTIONS[category] || 'Commands in this category'}\n\nUse \`/help\` to see all categories.`);
                
                // Add each command as a field with its description and permissions
                categoryCommands.forEach(cmd => {
                    let value = cmd.description;
                    if (cmd.permissions) {
                        value += `\n🔒 *Requires special permissions*`;
                    }
                    embed.addFields({
                        name: `/${cmd.name}${cmd.options}`,
                        value: value,
                        inline: false
                    });
                });
            } else {
                // List all categories with command counts
                embed.setDescription('📚 Below are all command categories. Use `/help category:name` to see commands in a specific category.');
                
                // Process each category folder
                for (const folder of commandFolders) {
                    try {
                        const categoryPath = path.join(commandsPath, folder);
                        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
                        
                        // Skip empty categories
                        if (commandFiles.length === 0) continue;
                        
                        // Get valid command count
                        const validCommands = commandFiles
                            .map(file => {
                                try {
                                    const command = require(path.join(categoryPath, file));
                                    return command.data?.name ? command.data.name : null;
                                } catch (err) {
                                    return null;
                                }
                            })
                            .filter(Boolean);
                        
                        // Get a few example commands (up to 3)
                        const examples = validCommands.slice(0, 3).map(cmd => `\`/${cmd}\``).join(', ');
                        const moreText = validCommands.length > 3 ? ` and ${validCommands.length - 3} more...` : '';
                        
                        // Create category field with description
                        if (validCommands.length > 0) {
                            const categoryEmoji = Object.keys(CATEGORY_DESCRIPTIONS).includes(folder) 
                                ? CATEGORY_DESCRIPTIONS[folder].split(' ')[0] 
                                : '📁';
                            
                            const categoryDescription = CATEGORY_DESCRIPTIONS[folder] || 'Commands in this category';
                            
                            embed.addFields({
                                name: `${categoryEmoji} ${folder.charAt(0).toUpperCase() + folder.slice(1)} (${validCommands.length})`,
                                value: `${categoryDescription}\n${examples}${moreText}`,
                                inline: false
                            });
                        }
                    } catch (err) {
                        console.error(`Error processing category ${folder}:`, err);
                    }
                }
            }

            await interaction.editReply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error in help command:', error);
            
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Error')
                        .setDescription('An error occurred while fetching the command list. Please try again later.')
                ],
                flags: MessageFlags.Ephemeral
            }).catch(e => console.error('Failed to send error response:', e));
        }
    }
};
