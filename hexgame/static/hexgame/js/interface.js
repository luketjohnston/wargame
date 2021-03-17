const num_territories = 40;
const TILE_WIDTH = 130;
const BORDER_WIDTH = 25
const BORDER_FILTER = new PIXI.filters.AlphaFilter();
BORDER_FILTER.alpha = 0.1;
const BORDER_CONT = new PIXI.Container();
BORDER_CONT.filters = [BORDER_FILTER];
const BOARD_SPEED = 10

const leftKey = keyboard("ArrowLeft");
const upKey = keyboard("ArrowUp");
const rightKey = keyboard("ArrowRight");
const downKey = keyboard("ArrowDown");
const aKey = keyboard("a")
const wKey = keyboard("w")
const sKey = keyboard("s")
const dKey = keyboard("d")

const protocol =  window.location.protocol === 'https:' ? 'wss' : 'ws' 

var chatSocket = new WebSocket(
  // TODO roomname
   protocol + '://'
   + window.location.host
   + '/ws/hexgame/board/'
   + gamename + '/'
);


let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

PIXI.utils.sayHello(type)

const MAX_PLAYERS = 10
let app = new PIXI.Application({width: 256, height: 256});
const BOARD_CONTAINER = new PIXI.Container()
var markers = [];
var assigners = [];
var troopCounter;
var available_troops;
var readyButton;
var combatIndicators = [];
var readyIndicators = [];

const playerColors = [0x2B7255, 0x094788, 0x8C0101, 0x9EA006, 0xEBA834, 0x9E9E9E, 0xB11FD1]
const board_edge_width = 6

var territory = new Array(board_edge_width * 2 - 1)
for (let i = 0; i < territory.length; i++) {
  territory[i] = new Array(board_edge_width * 2 - 1)
}

var borders = new Array(board_edge_width * 2 - 1);
for (let i = 0; i < borders.length; i++) {
  borders[i] = new Array(board_edge_width * 2 - 1)
  for (let j = 0; j < borders[i].length; j++) {
    borders[i][j] = new Array(3)
    for (let di = 0; di < 3; di ++) {
      borders[i][j][di] = new Array(3)
    }
  }
}

// the following are set by board.html:
// player, player_ready, gamename
// territory_owners, visible_attacks
// phase, turn, round, 
// available_troops, available_horses, available_mines,


document.body.appendChild(app.view);

//// create event listener for shift key
//let shiftKey = keyboard("Shift");

PIXI.Loader.shared
  .load(setup);

function setup() {
  // this code will run whent he loader has finished loading the image

  // TODO is this necessary?
  app.renderer.autoDensity = true;
  app.renderer.resize(2000, 2000);

  // 'board edge width
  bw = board_edge_width

  
  for (let i=0; i < bw * 2 - 1; i++) {
    for (let j= Math.max(i - bw + 1, 0); j < Math.min(bw + i, 2 * bw - 1); j++) {
      createHex(i,j)
    }
  }

  BOARD_CONTAINER.addChild(BORDER_CONT)
  app.stage.addChild(BOARD_CONTAINER)

  makeReadyButton();
  createPlayerList();
  update();

  //Start the game loop 
  app.ticker.add(delta => gameLoop(delta));
}

function gameLoop(delta) {
  if (leftKey.isDown || aKey.isDown) {
    BOARD_CONTAINER.x -= delta * BOARD_SPEED
  }
  if (rightKey.isDown || dKey.isDown) {
    BOARD_CONTAINER.x += delta * BOARD_SPEED
  }
  if (upKey.isDown || wKey.isDown) {
    BOARD_CONTAINER.y -= delta * BOARD_SPEED
  }
  if (downKey.isDown || sKey.isDown) {
    BOARD_CONTAINER.y += delta * BOARD_SPEED
  }
}

function getX(i,j) {
  return j * TILE_WIDTH - i * TILE_WIDTH / 2
}
function getY(i,j) {
  return i * 3 * TILE_WIDTH / Math.sqrt(3) / 2
}

function addPlayer(username, num) { 
    let r = new PIXI.Graphics();
    r.beginFill(playerColors[num]);
    r.drawRect(20,100+60*num,35,35)
    r.endFill();

    let indicator = new PIXI.Text('...');
    indicator.x = 24;
    indicator.y = 104 + (60 * num);
    readyIndicators.push(indicator)

    let text = new PIXI.Text(username);
    text.style = {fill: playerColors[num], font: "16px PetMe64"}
    text.x = 60;
    text.y = 100 + (60 * num);

    app.stage.addChild(r)
    app.stage.addChild(indicator)
    app.stage.addChild(text)
}
  

function createPlayerList() {
  gameText = new PIXI.Text(gamename);
  gameText.style = {fill: 'white', fontSize: "46px"}
  gameText.x = 20;
  gameText.y = 20;
  app.stage.addChild(gameText);

  for (let i = 0; i < usernames.length; i++) {
    addPlayer(usernames[i], i)
  }
}

function makeReadyButton() {
  let group = new PIXI.Container();

  let ready = new PIXI.Graphics();
  ready.beginFill(0xFFFFFF);
  ready.drawRect(0,0,200, 40)
  ready.endFill();
  let text = new PIXI.Text("Ready");
  text.x = 0; text.y = 0;
  text.width = 200; text.height = 35;
  
  group.addChild(ready); group.addChild(text);
  group.text = text;
  group.x = 1800; group.y = 750;

  // TODO
  // set to true during phase 0 for acting player
  group.interactive = true;
  group.buttonMode = true;

  group
      .on('mouseup', readyClick)
      .on('touchend', readyClick)
  app.stage.addChild(group);
  return group;
}

function readyClick() {
  sendReadyToServer();
}

function updateReadyIndicators() {
  for (let i = 0; i < player_ready.length; i++) {
    if (player_ready[i] === 0) {
      readyIndicators[i].text = '...';
    } else {
      readyIndicators[i].text = 'R';
    }
  }
}

function createHex(i,j) {
    let hex = new PIXI.Graphics();
    let baseColor =  0xFFFFFF
    hex.beginFill(baseColor);
    let minX = - getX(board_edge_width-1, 0)
    let minY =  - getY(0, 0)
    let [x,y] = [getX(i,j) + minX, getY(i,j) + minY]
    //hex.lineStyle(4, 0x000000, 1);
    let path = [
      TILE_WIDTH / 2, 0,
      TILE_WIDTH, TILE_WIDTH / 2 / Math.sqrt(3), 
      TILE_WIDTH, 3 * TILE_WIDTH / 2 / Math.sqrt(3), 
      TILE_WIDTH / 2, 2 * TILE_WIDTH / Math.sqrt(3), 
      0, 3 * TILE_WIDTH / 2 / Math.sqrt(3), 
      0, TILE_WIDTH / 2 / Math.sqrt(3), 
    ]
    hex.drawPolygon(path)
    hex.endFill();
    hex.x = x;
    hex.y = y;
    hex.owner = -1
    hex.setOwner = (owner) => {
      hex.tint = playerColors[owner]
      hex.owner = owner
    }
    territory[i][j] = hex
    BOARD_CONTAINER.addChild(hex)
}

function drawBorder(i1,j1,i2,j2) {

    dx = getX(i2,j2) - getX(i1,j1)
    dy = getY(i2,j2) - getY(i1,j1)

    // some math to figure out point coordinates
    // should probably just use sprites instead of all this garbage
    let radius = TILE_WIDTH / Math.sqrt(3)
    let ytemp = Math.sin(Math.PI/6) * (radius) - BORDER_WIDTH * Math.cos(Math.PI/6)
    let xtemp = TILE_WIDTH / 2
    let radinc = 2 * Math.PI/6 - Math.atan(ytemp / xtemp)
    let dist2 = Math.sqrt(ytemp * ytemp + xtemp * xtemp)

    let theta = Math.atan2(dy,dx)

    let border = new PIXI.Graphics();
    let baseColor =  0x000000
    border.beginFill(baseColor);
    let minX = - getX(board_edge_width-1, 0)
    let minY =  - getY(0, 0)
    let [x,y] = [getX(i1,j1) + minX, getY(i1,j1) + minY]
    let [cx, cy] = [x + TILE_WIDTH / 2, y + radius]

    let path = [
      Math.cos(theta - radinc) * (dist2), Math.sin(theta - radinc) * (dist2),
      Math.cos(theta - Math.PI/6) * radius, Math.sin(theta - Math.PI/6) * radius,
      Math.cos(theta + Math.PI/6) * radius, Math.sin(theta + Math.PI/6) * radius,
      Math.cos(theta + radinc) * (dist2), Math.sin(theta + radinc) * (dist2),
    ]
    border.drawPolygon(path)
    border.endFill();
    border.x = cx;
    border.y = cy;


    border.interactive = true;
  
    let smalldist = (radius - BORDER_WIDTH * Math.cos(Math.PI/6))
    let path2 = [
      Math.cos(theta - Math.PI/6) * (smalldist), Math.sin(theta - Math.PI/6) * (smalldist),
      Math.cos(theta - Math.PI/6) * radius, Math.sin(theta - Math.PI/6) * radius,
      Math.cos(theta + Math.PI/6) * radius, Math.sin(theta + Math.PI/6) * radius,
      Math.cos(theta + Math.PI/6) * (smalldist), Math.sin(theta + Math.PI/6) * (smalldist),
    ]
    border.hitArea = new PIXI.Polygon(path2);
    border.mouseover = function(mouseData) {
      console.log("IN mouseOVER")
    }
    borders[i1][j1][i2-i1 + 1][j2-j1 + 1] = border;
    BORDER_CONT.addChild(border)


}

function update() {
  console.log(territory_owners)

  for (let [i,j,owner] of territory_owners) {
    territory[i][j].setOwner(owner);
  }

  d_coords = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1]]
  for (let [i,j,_] of territory_owners) {
    for (let [di,dj] of d_coords) {
      if (territory[i+di] !== undefined && territory[i+di][j+dj] !== undefined) {
        if (territory[i+di][j+dj].owner != territory[i][j].owner) {
          drawBorder(i,j,i+di,j+dj)
        }
      } else {
        drawBorder(i,j,i+di,j+dj)
      }
    }
  }
  updateReadyIndicators();
}

function packageGamestate() {
  return JSON.stringify({ready_to_start: true})
  //if (phase == -1) {
  //}
}  

function updateGamestate(gamestate) {
  
  console.log('gamestate')
  console.log(gamestate)

  if ('usernames' in gamestate) {
    console.log('adding usernames')
    for (let i = readyIndicators.length; 
         i < gamestate['usernames'].length; i++) {
      console.log(gamestate['usernames'][i])
      console.log(i)
      addPlayer(gamestate['usernames'][i],i)
    }
  }

  if ('territory_owners' in gamestate) {
    territory_owners = gamestate.territory_owners; }
  if ('phase' in gamestate) {
    phase = gamestate.phase; }
  if ('turn' in gamestate) {
    turn = gamestate.turn; }
  if ('player_ready' in gamestate) {
    player_ready = gamestate.player_ready; }
}

function onmessage(e) {
  console.log("received message:")
  let message = JSON.parse(e.data);
  console.log(message)
  
  if ('playerReadyMessage' in message) {
    player_ready = message['playerReadyMessage']
    updateReadyIndicators();
  } else {
    updateGamestate(message);
    update();
  }
};

function onclose(e) {
  //console.error('Chat socket closed unexpectedly, or did not open. Reconnecting in 10 sec...');
  console.error('Chat socket closed unexpectedly, or did not open.');
  //// try to reconnect in half a second. If fails, will re-call this function
  //setTimeout(function() {
  //  chatSocket = new WebSocket(
  //    // TODO roomname
  //     protocol + '://'
  //     + window.location.host
  //     + '/ws/board/'
  //     + gamename + '/'
  //  );
  //  chatSocket.onmessage = onmessage;
  //  chatSocket.onclose = onclose;
  //  }, 10000);
};


chatSocket.onmessage = onmessage
chatSocket.onclose = onclose
//chatSocket.onerror = onclose

function sendResetToServer() {
  chatSocket.send(JSON.stringify({'reset' : true}))
}

function sendReadyToServer() {
  chatSocket.send(packageGamestate())
}

function keyboard(value) {
  let key = {};
  key.value = value;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;
  //The `downHandler`
  key.downHandler = event => {
    if (event.key === key.value) {
      if (key.isUp && key.press) key.press();
      key.isDown = true;
      key.isUp = false;
      event.preventDefault();
    }
  };

  //The `upHandler`
  key.upHandler = event => {
    if (event.key === key.value) {
      if (key.isDown && key.release) key.release();
      key.isDown = false;
      key.isUp = true;
      event.preventDefault();
    }
  };

  //Attach event listeners
  const downListener = key.downHandler.bind(key);
  const upListener = key.upHandler.bind(key);
  
  window.addEventListener(
    "keydown", downListener, false
  );
  window.addEventListener(
    "keyup", upListener, false
  );
  
  // Detach event listeners
  key.unsubscribe = () => {
    window.removeEventListener("keydown", downListener);
    window.removeEventListener("keyup", upListener);
  };
  
  return key;
}
  
