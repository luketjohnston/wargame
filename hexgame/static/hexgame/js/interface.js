// TODOS:
// remap scroll event to move board
import {makeBoard, LAKE_COLOR, BOARD_SPEED, PLAYER_COLORS, createHex, territory, BOARD_CONTAINER} from './board.js'
import {zeroAllBorders, makeAllBorders, updateBorderVisibles, unselectBorder, borders, BORDER_CONT, selectedBorder} from './borders.js'
import {rightDisplay, makeRightDisplay} from './display.js'
import {startSocket, assignmentMessage} from './messaging.js'

var PLAYER;
var usernames = [];
var phase = -1;
var turn;
var BOARD_EDGE_WIDTH;
var phaseText;

const INDIC_CONT = new PIXI.Container()


const MAX_PLAYERS = 10
const TEXT_STYLE = new PIXI.TextStyle({
  font: "PetMe64",
  fill: "white",
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowAngle: '0',
});

const LEFT = keyboard("ArrowLeft");
const UP = keyboard("ArrowUp");
const RIGHT = keyboard("ArrowRight");
const DOWN = keyboard("ArrowDown");
const A_KEY = keyboard("a")
const W_KEY = keyboard("w")
const S_KEY = keyboard("s")
const D_KEY = keyboard("d")
const Q_KEY = keyboard("q")
const E_KEY = keyboard("e")
const ESC = keyboard("Escape")

let readyIndicators = []
var hex_indices = []

let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

PIXI.utils.sayHello(type)

let app = new PIXI.Application({width: 256, height: 256});
var sheet;

// the following are set by board.html:
// const GAMENAME, const TILESET_URL

document.body.appendChild(app.view);


const loader = new PIXI.Loader();

loader.add(SPRITESHEET_URL);
loader.load(setup);

function setup(loader, resources) {
  // this code will run whent he loader has finished loading the image

  sheet = resources[SPRITESHEET_URL]
  // TODO is this necessary?
  app.renderer.autoDensity = true;
  app.renderer.view.style.position = "absolute";
  app.renderer.view.style.display = "block";
  app.renderer.resize(window.innerWidth, window.innerHeight);
  app.renderer.backgroundColor = LAKE_COLOR;

  app.stage.addChild(BOARD_CONTAINER)
  app.stage.addChild(INDIC_CONT)

  createPlayerList();
  makeRightDisplay(app);
  if (rightDisplay.updateTroops !== undefined) {
    rightDisplay.updateTroops(available_troops);
  }

  // start websocket, have to wait until after setup
  // so that first call to updateGamestate doesn't happen before
  // everything is initialized
  startSocket()

}

// call this after we've received a gamestate update with phase >= 0
// for the first time
function initialize() {
  makeBoard(BOARD_EDGE_WIDTH)
  // hex_indices is set by makeBoard
  makeAllBorders(hex_indices)
  BOARD_CONTAINER.addChild(BORDER_CONT)
  //updateBorderVisibles(hex_indices)
  //Start the game loop 
  app.ticker.add(delta => gameLoop(delta));
}

function updateGamestate(gamestate) {

  if ('player' in gamestate) {
    PLAYER = gamestate['player']
  }
  if ('usernames' in gamestate) {
    usernames = gamestate.usernames
    for (let i = readyIndicators.length; 
         i < gamestate.usernames.length; i++) {
      addPlayer(gamestate.usernames[i],i)
    }
  }
  if ('board_edge_width' in gamestate) {
    BOARD_EDGE_WIDTH = gamestate.board_edge_width
  }
  console.log(gamestate)
  if ('phase' in gamestate) {
    if (gamestate.phase >= 0 && phase == -1) {
      initialize()
    }
    console.log(phase)
    console.log(rightDisplay.started)
    if (gamestate.phase >= 0 && rightDisplay.started == false) {
      rightDisplay.startGame()
    }
    if (phase != gamestate.phase) {
      // zero all border assignments  
      zeroAllBorders(hex_indices)
      phase = gamestate.phase; 
      phaseText.text = "Turn: " + String(gamestate.turn) + ", Phase: " + String(gamestate.phase)
    }
  }
  if ('territory_owners' in gamestate) {
    for (let i=0; i < territory.length; i++) {
      for (let j=0; j < territory[0].length; j++) {
        if (territory[i][j]) {
          territory[i][j].setOwner(gamestate.territory_owners[i][j]);
        }
      }
    }
    updateBorderVisibles(hex_indices)
  }
  if ('assignments' in gamestate) {
    for (let [i1,j1,i2,j2,attack,defend,as,ds] of gamestate['assignments']) {

      borders[i1][j1][i2-i1+1][j2-j1+1].update(attack,defend,as,ds)
    }
  }
  if ('terrain' in gamestate) {
    for (let [i,j,t] of gamestate.terrain) {
      territory[i][j].setTerrain(t)
      updateBorderVisibles(hex_indices)
    }
  }
  if ('troopUpdate' in gamestate && rightDisplay.updateTroops !== undefined) {
    rightDisplay.updateTroops(gamestate['troopUpdate'])
  }
  if ('readies' in gamestate) {
    updateReadyIndicators(gamestate.readies);
  }
}

function numPlayers() {
  return readyIndicators.length
}
  

function gameLoop(delta) {
  if (LEFT.isDown || A_KEY.isDown) {
    BOARD_CONTAINER.x -= delta * BOARD_SPEED
  }
  if (RIGHT.isDown || D_KEY.isDown) {
    BOARD_CONTAINER.x += delta * BOARD_SPEED
  }
  if (UP.isDown || W_KEY.isDown) {
    BOARD_CONTAINER.y -= delta * BOARD_SPEED
  }
  if (DOWN.isDown || S_KEY.isDown) {
    BOARD_CONTAINER.y += delta * BOARD_SPEED
  }
}

function sendAttack(b,attack) {
  if (b !== undefined) {
    let [i1,j1,i2,j2] = b.ijij
    assignmentMessage(i1,j1,i2,j2,attack)
  }
}

Q_KEY.press = () => sendAttack(selectedBorder, false)
E_KEY.press = () => sendAttack(selectedBorder, true)

ESC.press = unselectBorder
  


function addPlayer(username, num) { 
    usernames.length = Math.max(num, usernames.length)
    usernames[num] = username
    let starty = 140
    let r = new PIXI.Graphics();
    r.beginFill(PLAYER_COLORS[num]);
    r.drawRect(20,starty+60*num,35,35)
    r.endFill();

    let indicator = new PIXI.Text('...');
    indicator.x = 24;
    indicator.y = starty + 4 + (60 * num);
    indicator.isready = false
    readyIndicators.push(indicator)

    let text = new PIXI.Text(username);
    Object.assign(text.style, TEXT_STYLE)
    text.style.fill = PLAYER_COLORS[num]
    text.style.fontSize = "24px"
    text.style.dropShadowDistance = "2"
    text.x = 60;
    text.y = starty + 4 + (60 * num);

    INDIC_CONT.addChild(r)
    INDIC_CONT.addChild(indicator)
    INDIC_CONT.addChild(text)
}
  

function createPlayerList() {
  let gameText = new PIXI.Text(GAMENAME);
  Object.assign(gameText.style, TEXT_STYLE)
  gameText.style.fontSize = '46px'
  gameText.x = 20;
  gameText.y = 20;

  phaseText = new PIXI.Text('Turn: 0, Phase: -1');
  Object.assign(phaseText.style, TEXT_STYLE)
  phaseText.x = 20;
  phaseText.y = 100;
   


  app.stage.addChild(gameText);
  app.stage.addChild(phaseText);
}

function getAttackStrength(i1,j1,i2,j2) {
  return border.attack_t
}

function getDefendStrength(i1,j1,i2,j2) {
  return border.defend_t
}



function updateReadyIndicators(readies) {
  for (let i = 0; i < readies.length; i++) {
    if (readyIndicators[i]) {
      if (!readies[i]) {
        readyIndicators[i].text = '...';
        readyIndicators[i].isready = false;
      } else {
        readyIndicators[i].text = 'R';
        readyIndicators[i].isready = true;
      }
    }
  }
}

function isReady(player) {
  if (player === undefined) {
    return false
  }
  return readyIndicators[player].isready
}
  





window.onresize = function() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  rightDisplay.updateSize();
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

export {numPlayers, BOARD_EDGE_WIDTH, PLAYER, isReady, phase, hex_indices, sheet, updateReadyIndicators, updateGamestate, addPlayer}
  
