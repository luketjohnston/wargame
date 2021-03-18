// TODOS:
// remap scroll event to move board

const num_territories = 40;
const TILE_WIDTH = 130;
const BORDER_WIDTH = 25
const BORDER_FILTER = new PIXI.filters.AlphaFilter();
BORDER_FILTER.alpha = 0.1;
const BORDER_CONT = new PIXI.Container();
BORDER_CONT.filters = [BORDER_FILTER];
const BOARD_SPEED = 10
const DISP_WIDTH = 400;

const TEXT_STYLE = new PIXI.TextStyle({
  font: "PetMe64",
  fill: "white",
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowAngle: '0',

});

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
var borderDisplay;
var selectedBorder;

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
  app.renderer.view.style.position = "absolute";
  app.renderer.view.style.display = "block";
  app.renderer.autoResize = true;
  app.renderer.resize(window.innerWidth, window.innerHeight);

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
  borderDisplay = makeBorderDisplay();
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
  Object.assign(gameText.style, TEXT_STYLE)
  gameText.style.fontSize = '46px'
  gameText.x = 20;
  gameText.y = 20;
  app.stage.addChild(gameText);

  for (let i = 0; i < usernames.length; i++) {
    addPlayer(usernames[i], i)
  }
}

function makeBorderDisplay() {
  let margin = 20
  let yoffset = 20
  let xoffset = 20

  dispRect = new PIXI.Graphics()
  dispRect.beginFill(0x000000);
  dispRect.drawRect(0,0,DISP_WIDTH, app.renderer.height - 2 * margin)
  dispRect.x = app.renderer.width - DISP_WIDTH - margin
  dispRect.y = margin
  dispRect.endFill();
  dispRect.alpha = 0.9;
  app.stage.addChild(dispRect)

  let t1 = new PIXI.Text('Available troops:')
  t1.style = TEXT_STYLE
  t1.x = 20
  t1.y = yoffset
  yoffset += 80
  t1.style = {fill: 0xFFFFFF, font: "16px PetMe64"}
  dispRect.addChild(t1)


  for (let i = 0; i < usernames.length; i++) {
    let r = new PIXI.Graphics();
    r.beginFill(playerColors[i]);
    r.drawRect(20,yoffset - margin,35,35)
    r.endFill();
    let indicator = new PIXI.Text('p' + String(i + 1));
    indicator.x = 24;
    indicator.y = yoffset + 4 - margin;

    let count = new PIXI.Text('0');
    count.style = TEXT_STYLE
    count.x = 90;
    count.y = yoffset + 4 - margin;
    dispRect.addChild(r)
    dispRect.addChild(indicator)
    dispRect.addChild(count)
    yoffset += 60

    dispRect.addChild(r)
    dispRect.addChild(indicator)
  }

  brk = new PIXI.Graphics();
  brk.beginFill(0xFFFFFF)
  brk_margin = margin * 2
  brk.drawRect(brk_margin,yoffset,DISP_WIDTH - 2 * brk_margin, 5)
  yoffset += 60
  brk.endFill()
  dispRect.addChild(brk)

  let selectMessage = new PIXI.Text('Click a border to assign troops');
  selectMessage.style = TEXT_STYLE
  selectMessage.x = 24;
  selectMessage.y = yoffset + 4 - margin;
  dispRect.addChild(selectMessage)

  
  let detailContainer = new PIXI.Container()
  dispRect.addChild(detailContainer)

  let newDescriptor = function(txt, i) {
    t = new PIXI.Text(txt)
    t.x = 20
    t.y = yoffset
    t.style = TEXT_STYLE

    v = new PIXI.Text('0')
    v.x = DISP_WIDTH - 30
    v.y = yoffset
    v.style = TEXT_STYLE
    yoffset += 60

    v.setVal = function(val) {
      v.text = String(val)
    }

    detailContainer.addChild(t)
    detailContainer.addChild(v)
    return v
  }
  detailContainer.visible = false

  attacks = newDescriptor('Assigned attacking troops:', 0)
  defends = newDescriptor('Assigned defending troops:', 1)
  attack_s = newDescriptor('Total attacking strength:', 2)
  defend_s = newDescriptor('Total defending strength:', 3)

  dispRect.setAttacks = function(a) {
    attacks.text = String(a)
  }
  dispRect.setDefends = function(a) {
    defends.text = String(a)
  }
  dispRect.setAttackStrength = function(a) {
    attack_s.text = String(a)
  }
  dispRect.setDefendStrength = function(a) {
    defend_s.text = String(a)
  }

  dispRect.showBorder = function(i1,j1,i2,j2) {
    selectMessage.visible = false
    detailContainer.visible = true
  }
  dispRect.hideBorderInfo = function() {
    selectMessage.visible = true
    detailContainer.visible = false
  }

  return dispRect


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

    border.buttonMode = true;
    border.interactive = true;
  
    let smalldist = (radius - BORDER_WIDTH * Math.cos(Math.PI/6))
    let path2 = [
      Math.cos(theta - Math.PI/6) * (smalldist), Math.sin(theta - Math.PI/6) * (smalldist),
      Math.cos(theta - Math.PI/6) * radius, Math.sin(theta - Math.PI/6) * radius,
      Math.cos(theta + Math.PI/6) * radius, Math.sin(theta + Math.PI/6) * radius,
      Math.cos(theta + Math.PI/6) * (smalldist), Math.sin(theta + Math.PI/6) * (smalldist),
    ]

    // need to make invisible element that is only shown when
    // a border is selected
    let selection = new PIXI.Graphics();
    selection.lineStyle(3,0x000000,1);
    selection.drawPolygon(path)
    selection.x = cx;
    selection.y = cy;
    selection.alpha = 0.8
    selection.visible = false
    app.stage.addChild(selection)


    border.hitArea = new PIXI.Polygon(path2);
    border.ijij = [i1,j1,i2,j2]
    border.alpha = 1
    let click = function() {
      selectedBorder = border
    }
    let mouseover = function() {
      selection.visible = true
    }
    let mouseout = function() {
      selection.visible = false
     }      


    border
      .on('mouseup', click)
      .on('touchend', click)
      .on('mouseupoutside', click)
      .on('touchendoutside', click)
      .on('mouseover', mouseover)
      .on('mouseout', mouseout)


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

window.onresize = function() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  app.stage.removeChild(borderDisplay);
  borderDisplay = makeBorderDisplay();
}
  


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
  
