/**
 * Poll manager utility for handling poll data and results
 * Created by itznan 2025
 * created by Itznan 
 * Discord = itz._.nan_
 */

class PollManager {
    constructor() {
        this.polls = new Map();
    }

    createPoll(messageId, data) {
        const poll = {
            question: data.question,
            authorId: data.authorId,
            channelId: data.channelId,
            guildId: data.guildId,
            endTime: data.endTime,
            votes: {
                yes: new Set(),
                no: new Set()
            }
        };
        this.polls.set(messageId, poll);
        return poll;
    }

    getPoll(messageId) {
        return this.polls.get(messageId) || null;
    }

    vote(messageId, userId, choice) {
        const poll = this.getPoll(messageId);
        if (!poll || !['yes', 'no'].includes(choice)) return null;

        // Remove previous vote if exists
        poll.votes.yes.delete(userId);
        poll.votes.no.delete(userId);

        // Add new vote
        poll.votes[choice].add(userId);

        return {
            yes: poll.votes.yes.size,
            no: poll.votes.no.size
        };
    }

    getResults(messageId) {
        const poll = this.getPoll(messageId);
        if (!poll) return null;

        return {
            question: poll.question,
            yes: poll.votes.yes.size,
            no: poll.votes.no.size,
            total: poll.votes.yes.size + poll.votes.no.size
        };
    }

    endPoll(messageId) {
        const results = this.getResults(messageId);
        this.polls.delete(messageId);
        return results;
    }

    getActivePollsToEnd() {
        const now = Date.now();
        const endingPolls = [];

        for (const [messageId, poll] of this.polls.entries()) {
            if (poll.endTime <= now) {
                endingPolls.push({
                    messageId,
                    results: this.endPoll(messageId)
                });
            }
        }

        return endingPolls;
    }
}

// Create a singleton instance
const pollManager = new PollManager();

// Define a function for poll cleanup that can be called directly
function cleanupEndedPolls() {
    try {
        const endingPolls = pollManager.getActivePollsToEnd();
        for (const { messageId, results } of endingPolls) {
            if (results) {
                console.log(`Poll ${messageId} ended with ${results.total} total votes`);
            }
        }
    } catch (error) {
        console.error('Error in poll cleanup:', error);
    }
}

// Start the poll cleanup interval - 10 seconds
let POLL_CHECK_INTERVAL = 10000;
// Ensure interval is valid and positive
if (POLL_CHECK_INTERVAL <= 0) {
    console.warn(`Invalid poll check interval: ${POLL_CHECK_INTERVAL}, using default of 10 seconds instead`);
    POLL_CHECK_INTERVAL = 10000; // Default to 10 seconds
}
setInterval(cleanupEndedPolls, POLL_CHECK_INTERVAL);

module.exports = pollManager;