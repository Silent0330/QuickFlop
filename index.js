const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { fail } = require('assert');

var col_num = 10,
    row_num = 10;
var colors = ['red', 'green', 'blue', 'orange', 'yellow', 'cyan', 'brown', 'purple']

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

class Card {
    constructor(id) {
        this.id = id;
        this.flipped = false;
        this.hidden = false;
    }
}

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.score = 0;
        this.selected = false;
        this.locked = false;
        this.row = 0;
        this.col = 0;
        this.timeoutID = null;
    }
}

function genCards(){
    let cards = new Array();
    let nums = [...Array(row_num*col_num).keys()];
    shuffle(nums);
    for(let i = 0; i < row_num; i++){
        cards[i] = new Array();
        for(let j = 0; j < col_num; j++){
            cards[i][j] = new Card(Math.floor(nums[i*col_num+j]/2) % 13);
        }
    }
    return cards;
}

class Room{
    constructor(id) {
        this.id = id;
        this.start = false;
        this.players = new Array();

        this.card_num = row_num * col_num;
        this.cards = genCards();
        this.key = Math.floor(Math.random()*10000000);
        this.c
    }
    join(player) {
        this.players.push(player);
    }
}

var room = new Room(0);

app.use('/public',express.static(__dirname + '/public'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(cookieParser());
//set view engine
app.set("view engine","jade")
//set view directory
app.set("views","jade")


app.get('/', (req, res) => {
    res.render('join');
});
app.post('/join', (req, res) => {
    let user_name = req.body.user_name;
    let renamed = false;
    for(let i = 0; i < room.players.length; i++){
        if(room.players[i].name == user_name){
            renamed = true;
            break;
        }
    }
    if(renamed){
        res.render('join', {fail: true, alert_msg: '名稱已被使用'});
    }
    else if(room.start){
        res.render('join', {fail: true, alert_msg: '房間已開始遊戲'});
    }
    else{
        res.cookie('key', room.key);
        res.redirect('/game');
    }
})

app.get('/game', (req, res) => {
    if(req.cookies.key != room.key){
        res.redirect('/');
        return;
    }
    for(let i = 0; i < room.players.length; i++){
        if(room.players[i].name == req.cookies.user_name){
            res.redirect('/');
            return;
        }
    }
    res.render('game');
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on("disconnect", () => {
        for(let i = 0; i < room.players.length; i++){
            if(room.players[i].id == socket.id){
                console.log(`${room.players[i].name} leave the room`);
                clearTimeout(room.players[i].timeoutID);
                io.to("game:0").emit('others leave', room.players[i].name);
                if(room.players[i].selected){
                    room.cards[room.players[i].row][room.players[i].col].flipped = false;
                    io.to('game:0').emit('release', room.players[i].row, room.players[i].col)
                }
                room.players.splice(i, 1);
                break;
            }
        }
        if(room.players.length == 0){
            room = new Room(0);
        }
        console.log('A user disconnected');
    });
    socket.on('chat message', (msg) => {
        io.sockets.emit('chat message', msg);
    });
    socket.on('join', (name) => {
        console.log(`${name} join to the room`);
        let player = new Player(socket.id, name);
        room.join(player);
        io.to('game:0').emit('others join', name);
        let names = new Array();
        for(i = 0; i < room.players.length; i++){
            names.push(room.players[i].name);
        }
        socket.emit("join success", names);
        socket.join("game:0");
    });
    socket.on('flip', (row, col)=> {
        if(!room.start){
            room.start = true;
        }
        if(room.cards[row][col].hidden || room.cards[row][col].flipped){
            return;
        }
        let player;
        for(let i = 0; i < room.players.length; i++){
            if(room.players[i].id == socket.id){
                player = room.players[i];
                break;
            }
        }

        if(player.locked){
            return;
        }

        room.cards[row][col].flipped = true;
        io.to('game:0').emit('flip', row, col, room.cards[row][col].id)

        if(!player.selected){
            player.selected = true;
            player.row = row;
            player.col = col;
        }
        else{
            let pre_row = player.row, pre_col = player.col;
            if(room.card_num > 0){
                player.locked = true;
                if(room.cards[row][col].id == room.cards[pre_row][pre_col].id){
                    room.cards[row][col].flipped = false;
                    room.cards[pre_row][pre_col].flipped = false;
                    io.to("game:0").emit('get pair', row, col, pre_row, pre_col, player.name);
                    player.score++;
                    room.card_num = room.card_num-2;
                }
                else{
                    room.cards[row][col].flipped = false;
                    room.cards[pre_row][pre_col].flipped = false;
                    io.to("game:0").emit('fail pair', row, col, pre_row, pre_col);
                }
                player.selected = false;
                player.timeoutID = setTimeout(() => {
                    player.locked = false;
                },500);
            }
            if(room.card_num == 0){
                let max_score = 0;
                let winners = new Array();
                for(let i = 0; i < room.players.length; i++){
                    if(room.players[i].score > max_score){
                        winners.length = 0;
                        winners.push(room.players[i].name);
                        max_score = room.players[i].score;
                    }
                    else if(room.players[i].score == max_score){
                        winners.push(room.players[i].name);
                    }
                }
                io.to("game:0").emit('end game', winners);
                room = new Room(0);
            }
        }

    });
});

server.listen(8001);