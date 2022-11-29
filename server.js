require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const mongoose = require('mongoose');
const GameData = require('./models/gameData');
const RoundData = require('./models/roundData');
 6
let port = process.env.PORT;
const mongoDB = process.env.MONGO_DB_URL;

mongoose.connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Database connected');
}).catch(err => console.log(err));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


let d_time, c_time, counter = 30, interval, round_id;




//Create GameData In DB on first time server start
async function checkIfCollectionExists() {
    let collectionExit = await GameData.findOne({ gameID: "12cards" });

    if (collectionExit === null) {
        let date = new Date();
        date.setSeconds(date.getSeconds() + counter);
        d_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        const Data = new GameData({
            gameID: "12cards",
            drawTime: d_time,
        });

        Data.save().then(() => {
            console.log(d_time + "-------------------------- created");
            StartRound();

        }).catch(err => console.log(err))
    } else {
        let date = new Date();
        date.setSeconds(date.getSeconds() + 30);
        d_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

        const updatedData = await GameData.updateOne({ gameID: "12cards" }, {
            $set: {
                drawTime: d_time,
            }
        },
            { new: true }).then(() => {
                console.log("draw time updated");
                io.emit("DrawTime", d_time);
                StartRound();
            });
    }
}
checkIfCollectionExists();

// Emiting the current server time every second
setInterval(() => {
    let date = new Date();
    c_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    io.emit('ServerTime', c_time);
    // console.log(c_time);
}, 1000);


// ---------------------------------------------------------------------------------socket
var users = [];
// socket is connected  here
io.on('connection', (socket) => {
    console.log('a user is connected');

    socket.on("connected", (userId) => {
        users[userId] = socket.id;
        console.log(users + "------------------------");
    });

    socket.on("sendEvent", async (data) => {
        var mes = "new message from: " + data.myId + " msg:" + data.message;
        io.to(users[data.userId]).emit("messageReceived", mes);
    })


    socket.on('chat message', (msg) => {
        socket.emit('chat message', msg);
    });

    // emiting the previous results when someone starts the game.
    async function GameDetails() {
        let response = await GameData.findOne({ gameID: "12cards" });
        // console.log(response);
        if (response !== null) {
            io.emit('PrevResults', response.previousResults);
            io.emit('DrawTime', response.drawTime);
        }
    }
    GameDetails();

});
// ---------------------------------------------------------------------------------socket


//function start game  and creating new round id and emiting it
const StartRound = async () => {
    let date = new Date();
    round_id = date.getDate().toString() + (date.getMonth() + 1).toString() + date.getFullYear().toString() + "-" + date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString();

    //create Roundid in DB
    const roundData = new RoundData({
        roundId: round_id,
        totalBets: 0,
        result: "-",

    });
    await roundData.save().then(() => {
        // console.log(roundData);
    }).catch(err => console.log(err));

    

    io.emit("RoundId", round_id);

    await GameData.updateOne({ gameID: "12cards" },
        {
            $set: {
                currentRoundID: round_id
            }
        }).then(() => {
            console.log("new roundid-------------     " + round_id);
        });

    interval = setInterval(() => {
        CalculateAndUpdateDrawTime();
    }, 1000);
}


const CalculateAndUpdateDrawTime = async () => {

    let date = new Date();
    c_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    counter = counter - 1;
    io.emit('Counter', counter);

    if (c_time === d_time) {
        console.log("matched");
        clearInterval(interval);

        let res = GetResult();
        io.emit('Result', res); // emit result
        await RoundData.updateOne({ roundId: round_id }, //update result in DB
            {
                $set: {
                    result: res,
                }
            });
        //TODO ---------- update the total bets in roundId-----------------------------------




        setTimeout(async () => {
            await GameData.updateOne({},
                {
                    $unset: {
                        "previousResults.0": 1
                    }
                });
            await GameData.updateOne({},
                {
                    $pull: {
                        "previousResults": null
                    }
                });


            // Storing result in DB
            GameData.updateOne(
                {
                    $push: {
                        previousResults: {
                            "time": d_time,
                            "card": res.card,
                            "pack": res.pack,
                        }
                    }
                },
                async function (error, success) {
                    if (error) {
                        console.log("errorr");
                        // console.log(error);
                    } else {
                        console.log("preResult updated");
                        // console.log(success);
                        let response = await GameData.findOne({ gameID: "12cards" });
                        io.emit('PrevResults', JSON.stringify(response.previousResults));
                        // console.log(response.previousResults);

                    }
                });
            // console.log("testting");

            let date = new Date();
            date.setSeconds(date.getSeconds() + 30); // time users get to bet
            d_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

            await GameData.updateOne({ gameID: "12cards" },
                {
                    $set: {
                        drawTime: d_time,
                    }
                },
                { new: true }).then(() => {
                    console.log("draw time updated");
                    io.emit("DrawTime", d_time);
                    StartRound();
                });


            counter = 30;
            io.emit('Counter', counter);

        }, 10000);// wait time for animation
    }
}


//Generate random number between 100 to 999
function GetResult() {
    let Card;
    let Pack;
    let x = Math.floor(Math.random() * (3)) + 1;
    if (x === 1) Card = "Jack";
    else if (x === 2) Card = "Queen";
    else Card = "King";


    let y = Math.floor(Math.random() * (4)) + 1;
    if (y === 1) Pack = "Heart";
    else if (y === 2) Pack = "Club";
    else if (y === 3) Pack = "Diamond";
    else Pack = "Spade";

    // let res = { "pack": Pack, "card": Card };

    return { "card": Card, "pack": Pack  };

}

server.listen(port, () => {
    console.log("listening to port : ", port);
});
