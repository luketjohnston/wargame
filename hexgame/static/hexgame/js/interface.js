// TODOS:
// remap scroll event to move board
import {makeBoard, LAKE_COLOR, BOARD_SPEED, PLAYER_COLORS, createHex, territory, BOARD_CONTAINER} from './board.js'
import {zeroAllBorders, makeAllBorders, updateBorderVisibles, unselectBorder, borders, BORDER_CONT, selectedBorder} from './borders.js'
import {rightDisplay, makeRightDisplay} from './display.js'
import {assignmentMessage} from './messaging.js'


// TODO: incrementing attack a lot and then moving board
// makes the board move slower... why would this be? very odd

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

var readyIndicators = []
var hex_indices = []



let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

PIXI.utils.sayHello(type)

let app = new PIXI.Application({width: 256, height: 256});
var sheet;

// the following are set by board.html:
// player, readies, gamename
// territory_owners, visible_attacks
// phase, turn, round, 
// available_troops, available_horses, available_mines,
// tilesetURL

document.body.appendChild(app.view);

PIXI.Loader.shared
  .add(spritesheetURL)
  .load(setup);

function setup() {
  // this code will run whent he loader has finished loading the image

  sheet = PIXI.Loader.shared.resources[spritesheetURL]
  // TODO is this necessary?
  app.renderer.autoDensity = true;
  app.renderer.view.style.position = "absolute";
  app.renderer.view.style.display = "block";
  app.renderer.resize(window.innerWidth, window.innerHeight);
  app.renderer.backgroundColor = LAKE_COLOR;

  app.stage.addChild(BOARD_CONTAINER)

  createPlayerList();
  makeRightDisplay(app);
  if (rightDisplay.updateTroops !== undefined) {
    rightDisplay.updateTroops(available_troops);
  }
  updateReadyIndicators();

  if (phase >= 0) {
    makeBoard(BOARD_EDGE_WIDTH)
    makeAllBorders(hex_indices)
    BOARD_CONTAINER.addChild(BORDER_CONT)

    for (let [i,j,owner] of territory_owners) {
      territory[i][j].setOwner(owner);
    }

    for (let [i,j,t] of terrain) {
      territory[i][j].setTerrain(t)
    }
    updateBorderVisibles(hex_indices)
    for (let [i1,j1,i2,j2,attack,defend,as,ds] of assignments) {
      borders[i1][j1][i2-i1+1][j2-j1+1].update(attack,defend,as,ds)
    }
  }

  //Start the game loop 
  app.ticker.add(delta => gameLoop(delta));
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
    let r = new PIXI.Graphics();
    r.beginFill(PLAYER_COLORS[num]);
    r.drawRect(20,100+60*num,35,35)
    r.endFill();

    let indicator = new PIXI.Text('...');
    indicator.x = 24;
    indicator.y = 104 + (60 * num);
    readyIndicators.push(indicator)

    let text = new PIXI.Text(username);
    Object.assign(text.style, TEXT_STYLE)
    text.style.fill = PLAYER_COLORS[num]
    text.style.fontSize = "24px"
    text.style.dropShadowDistance = "2"
    text.x = 60;
    text.y = 104 + (60 * num);

    app.stage.addChild(r)
    app.stage.addChild(indicator)
    app.stage.addChild(text)
}
  

function createPlayerList() {
  let gameText = new PIXI.Text(gamename);
  Object.assign(gameText.style, TEXT_STYLE)
  gameText.style.fontSize = '46px'
  gameText.x = 20;
  gameText.y = 20;
  app.stage.addChild(gameText);

  for (let i = 0; i < usernames.length; i++) {
    addPlayer(usernames[i], i)
  }
}

function getAttackStrength(i1,j1,i2,j2) {
  return border.attack_t
}

function getDefendStrength(i1,j1,i2,j2) {
  return border.defend_t
}



function updateReadyIndicators() {
  for (let i = 0; i < readies.length; i++) {
    if (readyIndicators[i]) {
      if (!readies[i]) {
        
        readyIndicators[i].text = '...';
      } else {
        readyIndicators[i].text = 'R';
      }
    }
  }
}



function updateGamestate(gamestate) {

    
  if ('phase' in gamestate) {
    console.log('phase')
    console.log(phase)
    if (phase == -1) {
      rightDisplay.startGame()
      BOARD_EDGE_WIDTH = gamestate.board_edge_width
      makeBoard(BOARD_EDGE_WIDTH)
      makeAllBorders(hex_indices)
      BOARD_CONTAINER.addChild(BORDER_CONT)
    }
    if (phase >= 0 && rightDisplay.troopList === undefined) {
      rightDisplay.startGame()
    }
    if (phase != gamestate.phase) {
      // zero all border assignments  
      zeroAllBorders(hex_indices)
    }
    
    phase = gamestate.phase; }
  
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

  if ('usernames' in gamestate) {
    for (let i = readyIndicators.length; 
         i < gamestate['usernames'].length; i++) {
      addPlayer(gamestate['usernames'][i],i)
    }
  }

  if ('territory_owners' in gamestate) {
    territory_owners = gamestate.territory_owners
    for (let [i,j,owner] of territory_owners) {
      territory[i][j].setOwner(owner);
      updateBorderVisibles(hex_indices)
    }
  }

  if ('turn' in gamestate) {
    turn = gamestate.turn; }
  if ('readies' in gamestate) {
    readies = gamestate.readies; 
    updateReadyIndicators();
  }
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

export {hex_indices, sheet, updateReadyIndicators, updateGamestate, addPlayer}
  
