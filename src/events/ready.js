/**
 * Message creation event handler
 * Created by itznan 2025
 */
//created by Itznan 
// Discord = itz._.nan_

const { EmbedBuilder, ActivityType } = require('discord.js');
// const logger = require('../utils/cleanLogger');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} is online and ready!`);

        // Function to calculate total number of members
        async function getTotalMembers() {
            let totalMembers = 0;
            client.guilds.cache.forEach(guild => {
                totalMembers += guild.memberCount;
            });
            return totalMembers;
        }

        // Function to get bot's RAM usage in MB
        function getBotRamUsage() {
            const used = process.memoryUsage();
            // Convert from bytes to MB and round to 2 decimal places
            return {
                heapUsed: Math.round((used.heapUsed / 1024 / 1024) * 100) / 100,
                heapTotal: Math.round((used.heapTotal / 1024 / 1024) * 100) / 100,
                rss: Math.round((used.rss / 1024 / 1024) * 100) / 100
            };
        }

        // Set bot presence
        async function updatePresence() {
            const totalMembers = await getTotalMembers();
            client.user.setPresence({
                activities: [{
                    name: `${totalMembers} members`,
                    type: ActivityType.Watching
                }],
                status: 'idle'
            });
        }

        // Initial presence update
        updatePresence();

        // Send RAM usage embed
        const ramChannel = await client.channels.fetch('1153157901817491486');
        if (ramChannel) {
            const ramUsage = getBotRamUsage();
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🤖 Bot Started')
                .setDescription('Bot has successfully connected to Discord!')
                .addFields(
                    { name: '📊 Memory Usage', value: 
                        `**Heap Used:** ${ramUsage.heapUsed} MB\n` +
                        `**Heap Total:** ${ramUsage.heapTotal} MB\n` +
                        `**RSS:** ${ramUsage.rss} MB`
                    },
                    { name: '📈 Memory Details', value: 
                        '• **Heap Used:** Active memory used by your bot\n' +
                        '• **Heap Total:** Total memory allocated\n' +
                        '• **RSS:** Total memory consumed by the process'
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Bot Memory Monitor' });

            try {
                await ramChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to send RAM usage embed:', error);
            }
        }

        // Update presence every 5 minutes instead of every second
        // This reduces API calls and helps prevent rate limits
        let presenceUpdateInterval = 300000; // 5 minutes in milliseconds
        if (presenceUpdateInterval <= 0) {
            console.warn(`Invalid interval value: ${presenceUpdateInterval}, using default of 5 minutes instead`);
            presenceUpdateInterval = 300000; // Default to 5 minutes
        }
        setInterval(updatePresence, presenceUpdateInterval);
    }
};
