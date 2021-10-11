var socket = io.connect();

var col_num = 10,
    row_num = 10;
var user_name = getCookie('user_name');

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    else return null;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function toCardNum(array) {
    for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(array[i]/2) % 13;
    }
}

function init(){
    /*
     * join to room
     */
    socket.emit('join', user_name);

    /*
     * create the card table
    let panel = document.getElementById("game_panel");
    let table = document.createElement('table'), tr, td;
    table.className = "card_table";
    for(let i = 0; i < row_num; i++){
        tr = document.createElement('tr');
        for(let j = 0; j < col_num; j++){
            td = document.createElement('td');
            tr.appendChild(td);
            td.innerHTML = `
            <div id="card_${i}_${j}" class="flip_container">
                <div class="flipper">
                    <div class="front">
                        <img class="card_img" src="public/img/card_back.jpg">
                    </div>
                    <div class="back">
                    </div>
                </div>
            </div>
            `;
        }
        table.appendChild(tr);
    }
    panel.appendChild(table);
     */
    
    var flip_containers = document.getElementsByClassName("flip_container");
    for(let i = 0; i < flip_containers.length; i++){
        flip_containers[i].addEventListener("click", ()=>{
            if(!flip_containers[i].classList.contains('flipped')){
                let row_col = flip_containers[i].id.split('_'); //id: card_row_col
                let row = parseInt(row_col[1]),
                    col = parseInt(row_col[2]);
                socket.emit('flip', row, col);
            }
        })
    }
}

init();

socket.on("join success", (names) => {
    let i;
    let info_panel = document.getElementById('info_panel');
    for(i = 0; i < names.length; i++){
        info_panel.innerHTML = info_panel.innerHTML  + `
            <div id='player_${names[i]}'>
                <h3 class="player_name">${names[i]}:</h3>
                <h3 class="player_score">0</h3>
            <div>`;
    }
});

socket.on('disconnect', () =>{
    location.replace(`/`)
});

socket.on("join fail", () => {
    location.replace(`/`)
});

socket.on("others join", (name) => {
    let info_panel = document.getElementById('info_panel');
    info_panel.innerHTML = info_panel.innerHTML  + `
        <div id='player_${name}'>
            <h3 class="player_name">${name}:</h3>
            <h3 class="player_score">0</h3>
        <div>`;
});

socket.on("others leave", (name) => {
    let player = document.getElementById(`player_${name}`);
    player.parentElement.removeChild(player);
});

socket.on('release', (row, col) => {
    let flip_container = document.getElementById(`card_${row}_${col}`);
    flip_container.classList.remove('flipped');
})

socket.on("flip", (row, col, value) => {
    let flip_container = document.getElementById(`card_${row}_${col}`);
    let cardback = flip_container.getElementsByClassName('back')[0];
    cardback.innerHTML = `<img class="card_img" src="public/img/card_${value}.jpg"></img>`;

    flip_container.style.backgroundColor = 'red';
    flip_container.classList.add('flipped');
});

socket.on("get pair", (row1, col1, row2, col2, name) => {
    let flip_container1 = document.getElementById(`card_${row1}_${col1}`);
    let flip_container2 = document.getElementById(`card_${row2}_${col2}`);
    let player_score = document.getElementById(`player_${name}`).getElementsByClassName('player_score')[0];
    setTimeout(() => {
        flip_container1.hidden = true;
        flip_container2.hidden = true;
    },1000);
    player_score.textContent = parseInt(player_score.textContent)+1;
});

socket.on("fail pair", (row1, col1, row2, col2) => {
    let flip_container1 = document.getElementById(`card_${row1}_${col1}`);
    let flip_container2 = document.getElementById(`card_${row2}_${col2}`);
    setTimeout(() => {
        flip_container1.style.backgroundColor = 'white';
        flip_container1.classList.remove('flipped');
        flip_container2.style.backgroundColor = 'white';
        flip_container2.classList.remove('flipped');
    },1000);
});

socket.on('end game', (winners) =>{
    console.log(winners);
    let winner_panel = document.createElement('div');
    winner_panel.id = 'winner_panel';
    let name_label = document.createElement('p');
    name_label.classList.add('winner_name');
    name_label.textContent = 'winers';
    winner_panel.appendChild(name_label);
    winners.forEach(winner => {
        let winner_name = document.createElement('p');
        winner_name.classList.add('winner_name');
        winner_name.textContent = winner;
        winner_panel.appendChild(winner_name);
        console.log(`winner: ${winner}`);
    });
    document.body.appendChild(winner_panel);
});