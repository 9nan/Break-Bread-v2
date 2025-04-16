/**
 * Event handler for Discord.js events
 * Created by itznan 2025
 */
//created by Itznan 
// Discord = itz._.nan_

const fs = require('fs');
const path = require('path');
// const logger = require('../utils/cleanLogger');

class EventHandler {
    constructor(client) {
        this.client = client;
        this.eventsDir = path.join(__dirname, '../events');
    }

    async loadEvents() {
        try {
            const eventFiles = (await fs.promises.readdir(this.eventsDir))
                .filter(file => file.endsWith('.js'));

            for (const file of eventFiles) {
                const filePath = path.join(this.eventsDir, file);
                const event = require(filePath);

                if (event.once) {
                    this.client.once(event.name, (...args) => event.execute(...args));
                } else {
                    this.client.on(event.name, (...args) => event.execute(...args));
                }
            }
        } catch (error) {
            // logger.error('Error loading events:', error);
            throw error;
        }
    }
}

module.exports = EventHandler;
