const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    profilepic: { 
        type: String, 
        default: 'default.png' 
    },
    gamesPlayed: { 
        type: Number, 
        default: 0,
        min: 0
    },
    wins: { 
        type: Number, 
        default: 0,
        min: 0
    },
    losses: { 
        type: Number, 
        default: 0,
        min: 0
    },
    draws: {
        type: Number,
        default: 0,
        min: 0
    },
    winRate: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 1
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Index for leaderboard queries
userSchema.index({ winRate: -1, wins: -1 });

// Method to calculate and update win rate
userSchema.methods.updateWinRate = function() {
    if (this.gamesPlayed > 0) {
        this.winRate = this.wins / this.gamesPlayed;
    } else {
        this.winRate = 0;
    }
};

// Method to record a win
userSchema.methods.recordWin = async function() {
    this.gamesPlayed += 1;
    this.wins += 1;
    this.updateWinRate();
    await this.save();
};

// Method to record a loss
userSchema.methods.recordLoss = async function() {
    this.gamesPlayed += 1;
    this.losses += 1;
    this.updateWinRate();
    await this.save();
};

// Method to record a draw
userSchema.methods.recordDraw = async function() {
    this.gamesPlayed += 1;
    this.draws += 1;
    this.updateWinRate();
    await this.save();
};

// Virtual for display-friendly win rate percentage
userSchema.virtual('winRatePercentage').get(function() {
    return Math.round(this.winRate * 100);
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
