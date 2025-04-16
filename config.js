/**
 * Configuration settings for the bot
 * Created by itznan 2025
 */

module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID || '1215881431473983569',
    guildId: process.env.GUILD_ID,
    lofiStreamUrl: 'http://lofi.stream.laut.fm/lofi',
    dbPaths: {
        welcome: './src/database/welcome.json',
        autorole: './src/database/autorole.json',
        moderation: './src/database/moderation.json',
        afk: './src/database/afk_users.json'
    }
};
