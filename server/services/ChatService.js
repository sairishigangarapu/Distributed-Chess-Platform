/**
 * ChatService - Handles chat message filtering and moderation
 */
class ChatService {
    constructor() {
        // Word list for filtering (expand as needed)
        this.badWords = [
            'badword1', 'badword2', 'curse', 'swear'
            // Add actual inappropriate words here
        ];
        
        // Compile regex patterns for efficiency
        this.patterns = this.badWords.map(word => 
            new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi')
        );
    }

    /**
     * Filter a message for inappropriate content
     * @param {string} message - The message to filter
     * @returns {object} - { isClean, cleanMessage, violations }
     */
    filterMessage(message) {
        if (!message || typeof message !== 'string') {
            return { isClean: false, cleanMessage: '', violations: ['Empty message'] };
        }

        let cleanMessage = message;
        const violations = [];

        this.patterns.forEach((pattern, index) => {
            if (pattern.test(message)) {
                violations.push(this.badWords[index]);
                cleanMessage = cleanMessage.replace(pattern, '****');
            }
        });

        return {
            isClean: violations.length === 0,
            cleanMessage: cleanMessage.trim(),
            violations
        };
    }

    /**
     * Check if a message contains any bad words
     * @param {string} message - The message to check
     * @returns {boolean}
     */
    containsBadWords(message) {
        return this.patterns.some(pattern => pattern.test(message));
    }

    /**
     * Sanitize message for display (prevent XSS)
     * @param {string} message - The message to sanitize
     * @returns {string}
     */
    sanitize(message) {
        if (!message || typeof message !== 'string') return '';
        
        return message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .trim()
            .slice(0, 500); // Max message length
    }

    /**
     * Format a chat message object
     * @param {object} user - The user sending the message
     * @param {string} message - The message content
     * @returns {object}
     */
    formatMessage(user, message) {
        const { cleanMessage } = this.filterMessage(message);
        
        return {
            id: this._generateMessageId(),
            oderId: user._id || user.oderId,
            username: user.username,
            message: this.sanitize(cleanMessage),
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleTimeString()
        };
    }

    /**
     * Add a word to the filter list
     * @param {string} word - Word to add
     */
    addBadWord(word) {
        if (word && !this.badWords.includes(word.toLowerCase())) {
            this.badWords.push(word.toLowerCase());
            this.patterns.push(new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi'));
        }
    }

    /**
     * Remove a word from the filter list
     * @param {string} word - Word to remove
     */
    removeBadWord(word) {
        const index = this.badWords.indexOf(word.toLowerCase());
        if (index > -1) {
            this.badWords.splice(index, 1);
            this.patterns.splice(index, 1);
        }
    }

    /**
     * Escape special regex characters
     * @private
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Generate unique message ID
     * @private
     */
    _generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ChatService;
