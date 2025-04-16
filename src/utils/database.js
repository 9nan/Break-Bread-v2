/**
 * Database utility functions for file-based data storage
 * created by Itznan 
 * Discord = itz._.nan_
 * Created by itznan 2025
 */

const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = {};
        this.initialized = false;
    }

    async init() {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            
            try {
                const fileContent = await fs.readFile(this.filePath, 'utf-8');
                this.data = JSON.parse(fileContent);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist, create it
                    await this.save();
                } else {
                    throw error;
                }
            }
            
            this.initialized = true;
        } catch (error) {
            console.error(`Error initializing database ${this.filePath}:`, error);
            throw error;
        }
    }

    async get(key) {
        if (!this.initialized) await this.init();
        return this.data[key];
    }

    async set(key, value) {
        if (!this.initialized) await this.init();
        this.data[key] = value;
        await this.save();
    }

    async delete(key) {
        if (!this.initialized) await this.init();
        delete this.data[key];
        await this.save();
    }

    async save() {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error(`Error saving database ${this.filePath}:`, error);
            throw error;
        }
    }
}

module.exports = Database;
