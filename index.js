import { v4 } from "uuid";
import wsServer from "./server.js";
import { readUsers } from "./express/controller.js";

let players = {};
let matches = {};

//configurações do jogo

const TPS = 30; //ticks por segundo da partida
const playerDefaultSpeed = 10; //a cada tick que tiver um input de movimento, anda X pixels para direção
const matchCoinsEnd = 40; //limite de moedas para terminar o jogo
const playerSize = { x: 59, y: 95 }; //em px
const itemSize = 32; //em px

const gameArea = {
  //em px
  x: 1536,
  y: 768,
};

const mapLimit = {
  //em px
  startX: 0,
  startY: 0,
  endX: 1536 - playerSize.x,
  endY: 768 - playerSize.y,
};

const small = 64;
const big = 128;
const blockMovement = [
  //linha 1
  { startX: 0, startY: 0, endX: 0 + small, endY: 0 + small },
  { startX: 512, startY: 0, endX: 512 + small, endY: 0 + small },
  { startX: 896, startY: 0, endX: 896 + big, endY: 0 + small },
  { startX: 1408, startY: 0, endX: 1408 + big, endY: 0 + big },
  //linha 2
  { startX: 0, startY: 128, endX: 0 + big, endY: 128 + small },
  { startX: 447, startY: 128, endX: 447 + small, endY: 128 + small },
  { startX: 577, startY: 128, endX: 577 + big, endY: 128 + big },
  { startX: 831, startY: 191, endX: 831 + small, endY: 191 + small },
  { startX: 1024, startY: 128, endX: 1024 + big, endY: 128 + big },
  { startX: 1408, startY: 128, endX: 1408 + small, endY: 128 + small },
  //linha 3
  { startX: 256, startY: 256, endX: 256 + big, endY: 256 + big },
  { startX: 1280, startY: 256, endX: 1280 + small, endY: 256 + small },
  //linha 4
  { startX: 128, startY: 447, endX: 128 + small, endY: 447 + small },
  { startX: 384, startY: 384, endX: 384 + small, endY: 384 + big },
  { startX: 512, startY: 384, endX: 512 + small, endY: 384 + small },
  { startX: 703, startY: 450, endX: 703 + small, endY: 450 + small },
  { startX: 1152, startY: 384, endX: 1152 + small, endY: 384 + small },
  //linha 5
  { startX: 640, startY: 578, endX: 640 + small, endY: 578 + small },
  { startX: 768, startY: 512, endX: 768 + small, endY: 512 + small },
  { startX: 833, startY: 512, endX: 833 + big, endY: 512 + small },
  { startX: 1280, startY: 512, endX: 1280 + big, endY: 512 + big },
  //linha 6
  { startX: 0, startY: 640, endX: 0 + big, endY: 640 + big },
  { startX: 224, startY: 640, endX: 224 + small, endY: 640 + small },
  { startX: 768, startY: 703, endX: 768 + small, endY: 703 + small },
  { startX: 1344, startY: 640, endX: 1344 + small, endY: 640 + big },
  { startX: 1408, startY: 704, endX: 1408 + big, endY: 704 + big },
  // { startX: 0, startY: 0, endX: startX + small, endY: startY + small },
];

updateMatches();

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);

  connection.on("open", () => console.log("Conexao aberta"));
  connection.on("close", () => console.log("Conexao fechada"));
  connection.on("message", (m) => {
    //a mensagem é sempre em json
    const message = JSON.parse(m.utf8Data);

    if (message.action == "login") {
      const uuid = message.uuid;
      const username = message.username;
      const password = message.password;

      readUsers().then((users) => {
        if (users[username] && users[username].password === password) {
          console.log(username + " logged in");

          players[uuid] = {
            connection,
            uuid,
            username,
            matchId: null,
          };

          let toSend = {
            action: "login",
          };

          connection.send(JSON.stringify(toSend));

          updateMatchList();
        } else {
          console.log(username + " with password " + password + " doesn't exist");
        }
      });
    }

    if (message.action == "message") {
      const toSend = {
        action: "message",
        username: players[message.uuid].username,
        message: message.message,
      };

      for (const p of Object.keys(players)) {
        //só manda a mensagem se não tiver em partida
        if (!players[p].matchId) {
          players[p].connection.send(JSON.stringify(toSend));
        }
      }
    }

    if (message.action == "createMatch") {
      const matchId = v4();
      const matchName = message.matchName;
      const uuid = message.uuid;

      matches[matchId] = newMatch(matchName, matchId, newPlayer(uuid));

      console.log(players[uuid].username + " created match " + matchName);

      joinMatch(matchId, uuid);
      updateMatchList();
    }

    if (message.action == "joinMatch") {
      const uuid = message.uuid;
      const matchId = message.matchId;
      const match = matches[matchId];

      if (!players[uuid].matchId && match.players.length < 3 && match.matchState === "Criando") {
        match.players.push(newPlayer(uuid));

        console.log(players[uuid].username + " joined match " + match.matchName);

        joinMatch(matchId, uuid);
        updateMatchList();
      }
    }

    if (message.action == "updatePosition") {
      const uuid = message.uuid;
      const matchId = message.matchId;
      const match = matches[matchId];

      match?.players.forEach((p) => {
        if (p.uuid === uuid) {
          p.moving.x = message.x;
          p.moving.y = message.y;
        }
      });
    }

    if (message.action == "startMatch") {
      const match = matches[message.matchId];

      console.log("partida " + match.matchName + " foi iniciada por " + match.players[0].username);

      if (match.players.length > 1) {
        match.matchState = "Iniciou";
        const toSend = {
          action: "startMatch",
          match,
        };

        match.players.forEach((p) => {
          players[p.uuid].connection.send(JSON.stringify(toSend));
        });

        updateMatchList();
        generateItems(match);
      }
    }
  });

  const uuid = v4(); //gerador de uuid

  const toSend = {
    action: "connect",
    uuid,
  };

  connection.send(JSON.stringify(toSend));
});

function updateMatchList() {
  const toSend = {
    action: "updateMatchList",
    matches,
  };

  for (const p of Object.keys(players)) {
    //só manda se não tiver em partida
    if (!players[p].matchId) {
      players[p].connection.send(JSON.stringify(toSend));
    }
  }
}

function joinMatch(matchId, uuid) {
  players[uuid].matchId = matchId;

  const toSend = {
    action: "joinMatch",
    match: matches[matchId],
  };

  matches[matchId].players.forEach((p) => {
    players[p.uuid].connection.send(JSON.stringify(toSend));
  });
}

function updateMatches() {
  for (const m of Object.keys(matches)) {
    const toSend = {
      action: "updateMatch",
      match: matches[m],
    };

    matches[m].players.forEach((p) => {
      if (p.moving.x != 0 || p.moving.y != 0) {
        p.position = canGo(p.position, { x: p.moving.x, y: p.moving.y }, p.speed);
        attemptGrabItem(p, matches[m]);
        if (p.coins === matchCoinsEnd) {
          //termina a partida aqui
          endMatch(matches[m], p.username);
        }
      }
    });

    matches[m]?.players.forEach((p) => {
      players[p.uuid].connection.send(JSON.stringify(toSend));
    });
  }

  setTimeout(updateMatches, 1000 / TPS);
}

function endMatch(match, username) {
  const toSend = {
    action: "endMatch",
    winner: username,
  };

  match.players.forEach((p) => {
    players[p.uuid].connection.send(JSON.stringify(toSend));
    players[p.uuid].matchId = null;
  });

  delete matches[match.matchId];
  updateMatchList();
}

function canGo(position, newPosition, speed) {
  let newX = position.x + newPosition.x * speed;
  let newY = position.y + newPosition.y * speed;

  const playerCenter = {
    x: position.x + playerSize.x / 2,
    y: position.x + playerSize.y / 2,
  };

  //doesn't let you walk out of the game area
  if (newPosition.x != 0) {
    if (newX < mapLimit.startX) newX = mapLimit.startX;
    else if (newX > mapLimit.endX) newX = mapLimit.endX;
  }
  if (newPosition.y != 0) {
    if (newY < mapLimit.startY) newY = mapLimit.startY;
    else if (newY > mapLimit.endY) newY = mapLimit.endY;
  }

  const player = {
    startX: newX,
    endX: newX + playerSize.x,
    startY: newY,
    endY: newY + playerSize.y,
  };

  //retorna uma posição válida se a nova posição é dentro de uma area bloqueada
  blockMovement.forEach((b) => {
    //checa se esta nos lados do player
    if (
      player.startX >= b.startX &&
      player.startX <= b.endX &&
      position.y <= b.startY &&
      position.y + playerSize.y >= b.endY
    ) {
      //se esta na esquerda do player
      if (
        (b.startY >= player.startY && b.startY <= player.endY) ||
        (b.endY >= player.startY && b.endY <= player.endY) ||
        (player.startY >= b.startY && player.startY <= b.endY) ||
        (player.endY >= b.startY && player.endY <= b.endY)
      ) {
        //esta tocando
        newX = b.endX + 1;
      }
    } else if (
      player.endX >= b.startX &&
      player.endX <= b.endX &&
      position.y <= b.startY &&
      position.y + playerSize.y >= b.endY
    ) {
      //se esta na dierita do player
      if (
        (b.startY >= player.startY && b.startY <= player.endY) ||
        (b.endY >= player.startY && b.endY <= player.endY) ||
        (player.startY >= b.startY && player.startY <= b.endY) ||
        (player.endY >= b.startY && player.endY <= b.endY)
      ) {
        //esta tocando
        newX = b.startX - playerSize.x - 1;
      }
    }

    //checa se esta em cima ou em baixo do player
    if (player.startY >= b.startY && player.startY <= b.endY) {
      //se esta acima do player
      if (
        (b.startX >= player.startX && b.startX <= player.startX) ||
        (b.endX >= player.startX && b.endX <= player.endX) ||
        (player.startX >= b.startX && player.startX <= b.endX) ||
        (player.endX >= b.startX && player.endX <= b.endX)
      ) {
        //esta tocando
        newY = b.endY + 1;
      }
    } else if (player.endY >= b.startY && player.endY <= b.endY) {
      //se esta abaixo do player
      if (
        (b.startX >= player.startX && b.startX <= player.startX) ||
        (b.endX >= player.startX && b.endX <= player.endX) ||
        (player.startX >= b.startX && player.startX <= b.endX) ||
        (player.endX >= b.startX && player.endX <= b.endX)
      ) {
        //esta tocando
        newY = b.startY - playerSize.y - 1;
      }
    }
  });

  return { x: newX, y: newY };
}

function returnSafeSpot(x, y) {
  const position = { x, y };
  blockMovement.forEach((b) => {
    if (x >= b.startX && x <= b.endX) x = b.startX - itemSize - 1;
    else if (x + itemSize >= b.startX && x + itemSize <= b.endX) x = b.endX + 1;
    if (y >= b.startY && y <= b.endY) y = b.endX + 1;
    else if (y + itemSize >= b.startY && y + itemSize <= b.endY) y = b.startY - itemSize - 1;
  });

  return position;
}

function generateItems(match) {
  const rng = Math.random();

  if (match.matchState == "Iniciou") {
    //gera uma coordenada aleatória
    const item = {
      type: null,
      position: {
        x: randomNumberBetween(0, gameArea.x - itemSize),
        y: randomNumberBetween(0, gameArea.y - itemSize),
      },
    };

    item.position = returnSafeSpot(item.position.x, item.position.y);

    if (rng <= 0.08)
      //8% de chance de gerar item que aumenta a velocidade
      item.type = "speed";
    else if (rng <= 0.15)
      //7% de chance de gerar item que diminui a velocidade
      item.type = "slow";
    else item.type = "coin"; //85% de chance de gerar uma moeda

    match.items[item.position.x + "x" + item.position.y] = {
      type: item.type,
      x: item.position.x,
      y: item.position.y,
    };

    setTimeout(() => generateItems(match), Math.floor(1500 / match.players.length));
  }
}

function attemptGrabItem(player, match) {
  const playerX = player.position.x;
  const playerY = player.position.y;
  const margin = 20;

  for (const i of Object.keys(match.items)) {
    const item = match.items[i];
    const itemCenter = { x: item.x + itemSize / 2, y: item.y + itemSize / 2 };

    if (
      itemCenter.x >= playerX - margin &&
      itemCenter.x <= playerX + playerSize.x + margin &&
      itemCenter.y >= playerY - margin &&
      itemCenter.y <= playerY + playerSize.y + margin
    ) {
      //encostrou no item
      if (item.type === "coin") {
        player.coins += 1;
      } else if (item.type === "slow") {
        player.speed = playerDefaultSpeed - 5;
      } else if (item.type === "speed") {
        player.speed = playerDefaultSpeed + 5;
      }

      delete match.items[i];
    }
  }
}

function randomNumberBetween(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function newMatch(matchName, matchId, player) {
  return {
    matchName,
    matchId,
    items: {},
    players: [newPlayer(player.uuid)],
    matchState: "Criando",
  };
}

function newPlayer(uuid) {
  return {
    username: players[uuid].username,
    uuid: players[uuid].uuid,
    coins: 0,
    moving: { x: 0, y: 0 },
    position: { x: 738, y: 336 },
    speed: playerDefaultSpeed,
  };
}
