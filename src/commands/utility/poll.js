const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MessageFlags } = require('discord.js');
const pollManager = require('../../utils/pollManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a yes/no poll')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('The poll question')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('days')
                .setDescription('How many days should the poll run (1-6)')
                .setMinValue(1)
                .setMaxValue(6))
        .addIntegerOption(option =>
            option
                .setName('hours')
                .setDescription('Additional hours (0-23)')
                .setMinValue(0)
                .setMaxValue(23)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const question = interaction.options.getString('question');
            const days = interaction.options.getInteger('days') || 1;
            const hours = interaction.options.getInteger('hours') || 0;
            
            const duration = (days * 24 + hours) * 60 * 60 * 1000; // Convert to milliseconds
            const endTime = Date.now() + duration;
            const endTimeString = `<t:${Math.floor(endTime / 1000)}:R>`;

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 Yes/No Poll')
                .setDescription(`**${question}**\n\nPoll ends: ${endTimeString}`)
                .addFields(
                    { name: '✅ Yes', value: '0 votes', inline: true },
                    { name: '❌ No', value: '0 votes', inline: true }
                )
                .setFooter({
                    text: `Created by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('poll_yes')
                        .setLabel('✅ Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('poll_no')
                        .setLabel('❌ No')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Create poll in manager
            pollManager.createPoll(message.id, {
                question,
                authorId: interaction.user.id,
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                endTime
            });

            // Set up collector for vote buttons
            const collector = message.createMessageComponentCollector({
                time: duration
            });

            collector.on('collect', async (i) => {
                try {
                    if (!i.isButton()) return;

                    const choice = i.customId.split('_')[1]; // 'yes' or 'no'
                    const results = pollManager.vote(message.id, i.user.id, choice);

                    if (!results) {
                        await i.reply({ content: '❌ This poll has ended.', flags: MessageFlags.Ephemeral });
                        return;
                    }

                    // Update embed with new vote counts
                    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                        .setFields(
                            { name: '✅ Yes', value: `${results.yes} votes`, inline: true },
                            { name: '❌ No', value: `${results.no} votes`, inline: true }
                        );

                    await i.update({ embeds: [updatedEmbed] });
                } catch (error) {
                    console.error('Error handling poll vote:', error);
                    try {
                        await i.reply({ content: '❌ There was an error recording your vote.', flags: MessageFlags.Ephemeral });
                    } catch (replyError) {
                        console.error('Error sending error message:', replyError);
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    const results = pollManager.getResults(message.id);
                    if (!results) return;

                    const totalVotes = results.yes + results.no;
                    const yesPercentage = totalVotes > 0 ? (results.yes / totalVotes * 100).toFixed(1) : 0;
                    const noPercentage = totalVotes > 0 ? (results.no / totalVotes * 100).toFixed(1) : 0;

                    const finalEmbed = EmbedBuilder.from(message.embeds[0])
                        .setColor(0x808080)
                        .setTitle('📊 Poll Ended')
                        .setFields(
                            { name: '✅ Yes', value: `${results.yes} votes (${yesPercentage}%)`, inline: true },
                            { name: '❌ No', value: `${results.no} votes (${noPercentage}%)`, inline: true },
                            { name: 'Total Votes', value: `${totalVotes} votes`, inline: false }
                        );

                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('poll_yes')
                                .setLabel(`✅ Yes (${yesPercentage}%)`)
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('poll_no')
                                .setLabel(`❌ No (${noPercentage}%)`)
                                .setStyle(ButtonStyle.Danger)
                                .setDisabled(true)
                        );

                    await message.edit({
                        embeds: [finalEmbed],
                        components: [disabledRow]
                    });
                } catch (error) {
                    console.error('Error ending poll:', error);
                }
            });
        } catch (error) {
            console.error('Error in poll command:', error);
            const errorResponse = { content: 'There was an error creating the poll.', flags: MessageFlags.Ephemeral };
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorResponse);
            } else {
                await interaction.reply(errorResponse);
            }
        }
    }
};
