let ws = new WebSocket("ws://localhost:4041");

const keys = {
  ArrowLeft: { held: false },
  ArrowRight: { held: false },
  ArrowUp: { held: false },
  ArrowDown: { held: false },
};

const TPS = 15;

let uuid;
let username;
let myMatch = null;
let currentSpeed = 0;

//elementos da pagina de login
const loginPage = document.getElementById("login-page");

const inputUsername = document.getElementById("username");
const inputPassword = document.getElementById("password");
const buttonLogin = document.getElementById("button-login");
buttonLogin.disabled = true;

//elementos da pagina do lobby
const lobbyPage = document.getElementById("lobby-page");
const matchList = document.getElementById("match-list");

const chatMessages = document.getElementById("chat-messages");
const inputMessage = document.getElementById("message");
const buttonMessage = document.getElementById("button-message");

const inputMatchName = document.getElementById("match-name");
const buttonCreateMatch = document.getElementById("button-createMatch");
buttonCreateMatch.disabled = true;

//musica que toca no lobby
const lobbyAudio = new Audio("../assets/sounds/lobby-music.mp3");
lobbyAudio.volume = 0.02;

//elementos do jogo
const gamePage = document.getElementById("game-page");
const playerList = document.getElementById("player-list");
const game = document.getElementById("game");
const itemsWrapper = document.getElementById("items-wrapper");
const buttonStartMatch = document.getElementById("button-startMatch");

//musica que toca no jogo e audio dos itens
const gameAudio = new Audio("../assets/sounds/game-music.mp3");
gameAudio.volume = 0.02;
const coinAudio = new Audio("../assets/sounds/coin-pickup.wav");
coinAudio.volume = 0.02;
const slowAudio = new Audio("../assets/sounds/slow-pickup.wav");
slowAudio.volume = 0.02;
const speedAudio = new Audio("../assets/sounds/speed-pickup.wav");
speedAudio.volume = 0.02;

//elementos da tela pós jogo
const winnerPage = document.getElementById("winner-page");
const winnerName = document.getElementById("winner-name");
const buttonContinuar = document.getElementById("winner-continuar");

loginPage.addEventListener("keyup", (e) => {
  const usernameText = inputUsername.value;
  const passwordText = inputPassword.value;

  if (usernameText.length > 0 && passwordText.length > 0) {
    buttonLogin.disabled = false;
    if (e.key === "Enter") {
      buttonLogin.click();
    }
  } else {
    buttonLogin.disabled = true;
  }
});

buttonLogin.addEventListener("click", (e) => {
  //clicou no botao de login
  if (inputUsername.value.length > 0 && inputPassword.value.length > 0) {
    username = inputUsername.value;
    password = inputPassword.value;

    const toSend = {
      action: "login",
      uuid: uuid,
      username,
      password,
    };

    ws.send(JSON.stringify(toSend));
    console.log(toSend);
  }
});

inputMessage.addEventListener("keyup", (e) => {
  e.preventDefault();
  if (e.key === "Enter") {
    buttonMessage.click();
  }
});

buttonMessage.addEventListener("click", (e) => {
  //clicou no botao de mandar mensagem
  if (inputMessage.value.length > 0) {
    const toSend = {
      action: "message",
      uuid: uuid,
      message: inputMessage.value,
    };

    ws.send(JSON.stringify(toSend));

    inputMessage.value = "";
  }
});

inputMatchName.addEventListener("keyup", (e) => {
  //apertou enter no input da mensagem
  const text = inputMatchName.value;
  if (text.length > 0 && !myMatch) {
    buttonCreateMatch.disabled = false;
  } else {
    buttonCreateMatch.disabled = true;
  }

  if (e.key == "Enter") {
    buttonCreateMatch.click();
  }
});

buttonCreateMatch.addEventListener("click", (e) => {
  //clicou no botao de criar partida
  if (inputMatchName.value.length > 0 && !myMatch) {
    const matchName = inputMatchName.value;

    const toSend = {
      action: "createMatch",
      uuid,
      matchName,
    };

    ws.send(JSON.stringify(toSend));

    inputMatchName.value = "";
  }
});

buttonStartMatch.addEventListener("click", (e) => {
  if (myMatch.players[0].uuid === uuid) {
    const toSend = {
      action: "startMatch",
      matchId: myMatch.matchId,
    };

    ws.send(JSON.stringify(toSend));
  }
});

buttonContinuar.addEventListener("click", (e) => {
  winnerPage.style.display = "none";
  lobbyPage.style.display = "flex";
  buttonStartMatch.disabled = false;

  gameAudio.pause();
  gameAudio.currentTime = 0;
  lobbyAudio.play();
});

lobbyAudio.addEventListener("ended", (e) => {
  if (!myMatch) lobbyAudio.play();
});

gameAudio.addEventListener("ended", (e) => {
  if (myMatch) gameAudio.play();
});

ws.onmessage = (m) => {
  //a mensagem é sempre em json
  const message = JSON.parse(m.data);
  if (message.action != "updateMatch") console.log(message);

  if (message.action === "connect") {
    uuid = message.uuid;
    console.log("Websocket connectado, uuid: " + uuid);
  }

  if (message.action === "login") {
    loginPage.style.display = "none";
    lobbyPage.style.display = "flex";

    lobbyAudio.play();
  }

  if (message.action === "message") {
    const m = createMessageElement(message.username, message.message);

    chatMessages.appendChild(m);
    m.scrollIntoView();
  }

  if (message.action === "updateMatchList") {
    //remove todas as partidas da lista de partidas
    while (matchList.firstChild) {
      matchList.removeChild(matchList.firstChild);
    }

    //para cada partida recebida
    for (const m of Object.keys(message.matches)) {
      match = message.matches[m];
      console.log(match);

      //cria um elemento html da partida
      const matchElement = createMatchElement(
        match.matchName,
        match.matchId,
        match.matchState,
        match.players.length
      );

      matchList.append(matchElement);
    }

    //adiciona um eventlistener para cada botao "entrar" das partidas
    if (matchList.firstChild) {
      const buttonJoinMatch = document.getElementsByClassName("button-joinMatch");
      for (const b of Object.keys(buttonJoinMatch)) {
        buttonJoinMatch[b].addEventListener("click", (e) => {
          joinMatch(e.target.getAttribute("matchId"));
        });
      }
    }
  }

  if (message.action === "joinMatch") {
    if (!myMatch) {
      document.addEventListener("keydown", handleArrowPress);
      document.addEventListener("keyup", handleArrowRelease);
    }

    lobbyAudio.pause();
    lobbyAudio.currentTime = 0;

    gameAudio.play();

    myMatch = message.match;

    sendInputs();

    lobbyPage.style.display = "none";
    gamePage.style.display = "flex";

    const numberOfPlayers = message.match.players.length;

    //se voce é o criador da partida, pode iniciá-la
    if (myMatch.players[0].uuid === uuid) {
      buttonStartMatch.style.display = "block";
    }

    while (playerList.firstChild) {
      playerList.removeChild(playerList.firstChild);
    }
    while (game.firstChild) {
      game.removeChild(game.firstChild);
    }

    myMatch.players.forEach((p, index) => {
      const playerIconElement = createPlayerIconElement(p.username, p.coins, index + 1);
      playerList.appendChild(playerIconElement);

      const playerElement = createPlayerElement(p.uuid, index + 1);
      game.appendChild(playerElement);
    });
  }

  if (message.action === "updateMatch") {
    myMatch = message.match;

    const coinCounters = document.getElementsByClassName("coin-counter");
    for (const c in Object.keys(coinCounters)) {
      const newCoins = myMatch.players[c].coins;
      if (myMatch.players[c].uuid === uuid) {
        if (coinCounters[c].textContent != newCoins) coinAudio.play();
        if (myMatch.players[c].speed > 20 && currentSpeed != 1) {
          speedAudio.play();
          currentSpeed = 1;
        }
        if (myMatch.players[c].speed < 20 && currentSpeed != -1) {
          slowAudio.play();
          currentSpeed = -1;
        }
      }

      coinCounters[c].textContent = newCoins;
    }

    const players = document.getElementsByClassName("player");
    for (const p of Object.keys(players)) {
      const position = { x: myMatch.players[p].position.x, y: myMatch.players[p].position.y };

      players[p].style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }

    while (itemsWrapper.firstChild) {
      itemsWrapper.removeChild(itemsWrapper.firstChild);
    }
    for (const i of Object.keys(myMatch.items)) {
      const item = myMatch.items[i];
      createItem(item);
    }
  }

  if (message.action === "startMatch") {
    buttonStartMatch.disabled = true;
    buttonStartMatch.style.display = "none";
  }

  if (message.action === "endMatch") {
    gamePage.style.display = "none";
    winnerPage.style.display = "flex";

    winnerName.textContent = message.winner;

    myMatch = null;
  }
};

function joinMatch(mId) {
  const toSend = {
    action: "joinMatch",
    uuid,
    matchId: mId,
  };

  ws.send(JSON.stringify(toSend));
}

function createMessageElement(username, message) {
  const div = document.createElement("span");
  div.style.fontWeight = 600;
  div.style.color = "white";
  div.textContent = "[" + username + "] " + message;

  return div;
}

function createMatchElement(matchName, matchId, matchState, playerCount) {
  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.justifyContent = "space-between";
  div.style.alignItems = "center";
  div.style.borderBottomWidth = "1px";
  div.style.borderColor = "rgb(0 0 0 / 0.1)";
  div.style.paddingBottom = "0.5rem";

  const span = document.createElement("span");
  span.style.fontWeight = 600;
  span.textContent = matchName + " - " + matchState;

  const div2 = document.createElement("div");
  div2.style.display = "flex";
  div2.style.justifyContent = "space-between";
  div2.style.alignItems = "center";
  div2.style.columnGap = "1rem";

  const span2 = document.createElement("span");
  span2.style.fontSize = "0.75rem";
  span2.style.lineHeight = "1rem";
  span2.textContent = playerCount + "/3";

  const button = document.createElement("button");
  button.style.paddingLeft = "0.5rem";
  button.style.paddingRight = "0.5rem";
  button.style.paddingTop = "0.25rem";
  button.style.paddingBottom = "0.25rem";
  button.style.backgroundColor = "white";
  button.style.borderRadius = "0.5rem";
  button.setAttribute("matchId", matchId);
  button.classList.add("button-joinMatch");
  button.textContent = "Entrar";

  div2.appendChild(span2);
  div2.appendChild(button);

  div.appendChild(span);
  div.appendChild(div2);

  return div;
}

function createPlayerIconElement(username, coins, playerNumber) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.columnGap = "1rem";
  wrapper.style.paddingTop = "0.5rem";
  wrapper.style.paddingBottom = "0.5rem";
  wrapper.style.paddingLeft = "1rem";
  wrapper.style.paddingRight = "1rem";
  wrapper.style.width = "max-content";
  wrapper.style.height = "max-content";
  wrapper.style.backgroundColor = "rgb(156 163 175)";
  wrapper.style.alignItems = "center";
  wrapper.style.borderRadius = "9999px";

  const iconSpan = document.createElement("span");
  iconSpan.style.paddingTop = "0.5rem";
  iconSpan.style.paddingBottom = "0.5rem";
  iconSpan.style.width = "3rem";
  iconSpan.style.height = "3rem";
  iconSpan.style.backgroundPosition = "center";
  iconSpan.style.backgroundSize = "cover";
  iconSpan.style.backgroundImage = "url('../assets/players/icons/p" + playerNumber + ".png')";

  wrapper.appendChild(iconSpan);

  const wrapper2 = document.createElement("div");
  wrapper2.style.display = "flex";
  wrapper2.style.flexDirection = "column";

  wrapper.appendChild(wrapper2);

  const usernameSpan = document.createElement("span");
  usernameSpan.style.fontWeight = 700;
  usernameSpan.classList.add("username-span");
  usernameSpan.textContent = username;

  wrapper2.appendChild(usernameSpan);

  const coinDiv = document.createElement("div");
  coinDiv.style.display = "flex";
  coinDiv.style.alignItems = "center";
  coinDiv.style.columnGap = "0.25rem";
  coinDiv.style.fontWeight = 700;
  coinDiv.style.color = "rgb(250 204 21)";

  wrapper2.appendChild(coinDiv);

  const coinParagraph = document.createElement("p");
  coinParagraph.classList.add("coin-counter");
  coinParagraph.textContent = coins;

  coinDiv.appendChild(coinParagraph);

  const coinSpan = document.createElement("span");
  coinSpan.style.width = "1.5rem";
  coinSpan.style.height = "1.5rem";
  coinSpan.style.backgroundSize = "cover";
  coinSpan.style.backgroundPosition = "center";
  coinSpan.style.backgroundImage = "url('../assets/items/coin.png')";

  coinDiv.appendChild(coinSpan);

  return wrapper;
}

function createPlayerElement(playerId, playerNumber) {
  const playerDiv = document.createElement("div");
  playerDiv.style.position = "absolute";
  playerDiv.style.display = "block";
  playerDiv.style.width = "59px";
  playerDiv.style.height = "95px";
  playerDiv.style.transition = "transform 0.15s";
  playerDiv.style.backgroundImage = "url('../assets/players/p" + playerNumber + "-small.png')";

  if (uuid === playerId) {
    playerDiv.classList.add("player", "you");
    playerDiv.style.zIndex = 1;
  } else {
    playerDiv.classList.add("player");
  }
  playerDiv.setAttribute("playerId", playerId);

  return playerDiv;
}

function createItem({ type, x, y }) {
  let backgroundImageUrl = "";
  let size = "2rem";
  const item = document.createElement("span");

  item.style.position = "absolute";

  item.style.backgroundSize = "cover";
  item.style.backgroundPosition = "center";
  item.style.transform = `translate3d(${x}px, ${y}px, 0)`;

  if (type === "coin") {
    backgroundImageUrl = "url('../assets/items/coin.png')";
  } else if (type === "speed") {
    backgroundImageUrl = "url('../assets/items/speed.png')";
    size = "2.75rem";
  } else if (type === "slow") {
    backgroundImageUrl = "url('../assets/items/slow.png')";
    size = "2.75rem";
  }

  item.style.backgroundImage = backgroundImageUrl;
  item.style.width = size;
  item.style.height = size;

  itemsWrapper.appendChild(item);
}

function handleArrowPress(e) {
  if (e.key === "ArrowLeft") {
    keys["ArrowLeft"].held = true;
  } else if (e.key === "ArrowRight") {
    keys["ArrowRight"].held = true;
  } else if (e.key === "ArrowUp") {
    keys["ArrowUp"].held = true;
  } else if (e.key === "ArrowDown") {
    keys["ArrowDown"].held = true;
  }
}

function handleArrowRelease(e) {
  if (e.key === "ArrowLeft") {
    keys["ArrowLeft"].held = false;
  } else if (e.key === "ArrowRight") {
    keys["ArrowRight"].held = false;
  } else if (e.key === "ArrowUp") {
    keys["ArrowUp"].held = false;
  } else if (e.key === "ArrowDown") {
    keys["ArrowDown"].held = false;
  }
}

function sendInputs() {
  let x = 0;
  let y = 0;

  if (keys["ArrowLeft"].held) x = -1;
  else if (keys["ArrowRight"].held) x = 1;
  if (keys["ArrowUp"].held) y = -1;
  else if (keys["ArrowDown"].held) y = 1;

  const toSend = {
    action: "updatePosition",
    uuid,
    matchId: myMatch.matchId,
    x,
    y,
  };

  ws.send(JSON.stringify(toSend));

  if (myMatch) {
    setTimeout(sendInputs, 1000 / TPS);
  }
}
