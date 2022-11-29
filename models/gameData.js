const mongoose = require('mongoose');

const gameDataSchema = new mongoose.Schema({
    gameID: {
        type: String,
        require: true,
    },
    drawTime: {
        type: String,
        require: true,
    },
    currentRoundID: {
        type: String,
        require: true,
    },
    previousResults: [
        {
            time: String,
            card: String,
            pack: String,
        }
    ]
});

gameDataSchema.set('timestamps', true);

const GameData = mongoose.model('gameData', gameDataSchema);
module.exports = GameData;