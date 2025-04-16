/**
 * Voice channel management utility functions
 * Created by itznan 2025
 * created by Itznan 
 * Discord = itz._.nan_
 */

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

class VoiceManager {
    constructor() {
        this.connections = new Map();
        this.players = new Map();
        this.timeouts = new Map();
    }

    createConnection(channel) {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        this.connections.set(channel.guild.id, connection);
        return connection;
    }

    getConnection(guildId) {
        return this.connections.get(guildId);
    }

    createPlayer(guildId) {
        const player = createAudioPlayer();
        this.players.set(guildId, player);
        return player;
    }

    getPlayer(guildId) {
        return this.players.get(guildId);
    }

    destroyConnection(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }

        const player = this.players.get(guildId);
        if (player) {
            player.stop();
            this.players.delete(guildId);
        }

        this.clearTimeout(guildId);
    }

    setAutoLeaveTimeout(guildId, callback, delay = 5 * 60 * 1000) {
        this.clearTimeout(guildId);
        
        // Ensure delay is valid and positive
        if (typeof delay !== 'number' || delay <= 0) {
            console.warn(`Invalid timeout value: ${delay}, using default of 5 minutes instead`);
            delay = 5 * 60 * 1000; // Default to 5 minutes
        }
        
        const timeout = setTimeout(() => {
            this.destroyConnection(guildId);
            if (callback) callback();
        }, delay);
        this.timeouts.set(guildId, timeout);
    }

    clearTimeout(guildId) {
        const timeout = this.timeouts.get(guildId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(guildId);
        }
    }

    cleanup() {
        for (const [guildId] of this.connections) {
            this.destroyConnection(guildId);
        }
    }
}

module.exports = new VoiceManager();
