const mongoose = require('mongoose');


const roundDataSchema = new mongoose.Schema({
    roundId: {
        type: String,
        required: true,
    },
    totalBets: {
        type: Number,
    },
    result: {
        card: String,
        pack: String,
    },
    betsDetails: [
        {
            userId: String,
            dateTime: String,
            bets: [
                {
                    card: String,
                    pack: String,
                    amountBet: Number,
                }
            ],
            winning: Number,
        }
    ],

});

const RoundData = mongoose.model('roundData', roundDataSchema);
module.exports = RoundData;