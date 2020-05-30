const num_territories = 40;

var chatSocket = new WebSocket(
  // TODO roomname
  'ws://'
   + window.location.host
   + '/ws/board/'
   + gameid + '/'
   + PLAYER + '/'
);


let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

PIXI.utils.sayHello(type)

//console.log(visible_attacks);


let app = new PIXI.Application({width: 256, height: 256});
var markers = [];
var assigners = [];
var troopCounter;
var available_troops;
var readyButton;
var combatIndicators = [];
var readyIndicators = [];

const playerColors = [0x2B7255, 0x094788, 0x8C0101, 0x9EA006]

document.body.appendChild(app.view);

// create event listener for shift key
let shiftKey = keyboard("Shift");


// TODO store in database so easier to modify?

var marker_xcoords = [242,415,539,616,583,763,789,929,1123,1199,1338,1559,1882,1876,1618,1475,1637,1435,1347,1563,284,434,816,1142,1229,1198,1505,1596,1727,1855,588,580,208,294,244,822,946,1013,966,1188] 
var marker_ycoords = [1488,1277,1081,855,1421,1280,991,1374,1385,1097,1294,1565,1545,1297,1286,1076,1070,854,614,628,106,218,183,280,450,96,186,452,218,376,345,640,718,934,1111,635,459,616,822,806]



var land_attacks = [
  [2,5],                       //1
  [35, 3, 5, 1],               //2
  [34, 4, 7, 6, 2],            //3
  [33, 3, 36, 39, 7],          //4
  [1, 2, 6, 8],                //5
  [5, 3, 7, 8, 9, 10, 39],     //6
  [6, 3, 4, 39],               // 7
  [9, 6, 5],                   // 8
  [8, 6, 11, 12],              // 9
  [11, 6, 39, 40, 18, 16],     // 10
  [9, 12, 10, 15, 16],         // 11
  [9, 11, 15, 13],             // 12
  [12, 15, 14],                // 13
  [15, 13, 17],                // 14
  [11, 12, 13, 14, 16, 17],    // 15
  [11, 10, 18, 15, 17],        // 16
  [14, 15, 16, 18],            // 17
  [10,16,17,19,20,40],         // 18
  [18,20,25,40],               // 19
  [18,19,28,],                 // 20
  [22],                        // 21
  [21,31,23],                  // 22
  [22,31,37,24,26],            // 23
  [25,37,23,26,27,28],         // 24
  [38,37,24,28,19],            // 25
  [23,24,27],                  // 26
  [28,24,26,29],               // 27
  [25,24,27,29,30,20],         // 28
  [30,28,27],                  // 29
  [28,29],                     // 30
  [32,22,23,36],            // 31
  [33,31,36],                  // 32
  [32,4,34],                   // 33
  [33,3,35],                   // 34
  [34,2],                      // 35
  [32,31,37,38,39,4],          // 36
  [36,23,24,25,38],         // 37
  [36,39,40,25,37],            // 38
  [4,7,6,10,40,38,36],         // 39
  [10,39,18,19,38]             // 40
]

var attack_xcoords =
[[2,5],[35,3,5,345],[34,4,7,6,493],[33,534,36,39,7],[443,466,6,8],[656,642,7,8,9,10,39],[870,650,676,39],[9,854,803],[1015,1050,11,12],[11,1078,39,40,18,16],[1208,12,1279,15,16],[1282,1401,15,13],[1777,15,14],[15,1843,17],[1505,1589,1735,1730,16,17],[1425,1388,18,1547,17],[1743,1655,1541,18],[1344,1471,1672,19,20,40],[1449,20,25,40],[1605,1446,1579],[22],[344,31,23],[700,31,37,24,26],[25,37,1013,26,27,28],[38,37,1229,28,1366],[1015,1187,27],[28,1379,1428,29],[1412,1382,1493,29,30,1585],[30,1659,1629],[1708,1813],[32,504,715,36],[33,575,36],[463,536,34],[297,404,35],[242,365],[656,744,37,38,39,709],[873,852,1046,1119],[909,39,40,1192,1016],[804,870,986,1105,40,976,834],[1221,1095,1309,1303,1112]]

var attack_ycoords = 
[[2,5],[35,3,5,1481],[34,4,7,6,1187],[33,1001,36,39,7],[1573,1370,6,8],[1373,1168,7,8,9,10,39],[1074,1096,927,39],[9,1327,1498],[1407,1229,11,12],[11,1136,39,40,18,16],[1358,12,1138,15,16],[1496,1391,15,13],[1631,15,14],[15,1433,17],[1383,1508,1473,1325,16,17],[1238,1117,18,1273,17],[1139,1241,1087,18],[1025,975,961,19,20,40],[807,20,25,40],[766,645,504],[22],[160,31,23],[173,31,37,24,26],[25,37,260,26,27,28],[38,37,354,28,548],[175,236,27],[28,289,155,29],[443,344,307,29,30,549],[30,349,163],[471,318],[32,264,297,36],[33,489,36],[626,828,34],[825,986,35],[1008,1245],[679,487,37,38,39,795],[548,343,350,475],[648,39,40,546,536],[828,919,1054,1008,40,707,729],[1021,874,866,716,715]]

var attack_rots = 
[[2,5],[35,3,5,3.599999999999995],[34,4,7,6,3.4999999999999947],[33,4.099999999999996,36,39,7],[3.8499999999999943,-1.1000000000000016,6,8],[3.900000000000004,5.649999999999991,7,8,9,10,39],[8.700000000000003,3.6499999999999977,5.999999999999993,39],[9,5.600000000000001,4.150000000000003],[4.650000000000012,12.250000000000053,11,12],[11,10.050000000000022,39,40,18,16],[10.150000000000016,12,12.400000000000034,15,16],[10.900000000000027,12.600000000000023,15,13],[16.500000000000064,15,14],[15,15.900000000000041,17],[10.649999999999995,16.30000000000006,14.700000000000024,13.95,16,17],[10.24999999999999,10.75000000000001,18,15.450000000000006,17],[14.550000000000008,15.500000000000007,16.75000000000001,18],[9.899999999999999,15.24999999999999,15.54999999999998,19,20,40],[15.299999999999962,20,25,40],[15.649999999999967,23.500000000000064,32.00000000000006],[22],[17.44999999999995,31,23],[24.250000000000032,31,37,24,26],[25,37,24.100000000000016,26,27,28],[38,37,25.050000000000015,28,15.549999999999951],[23,22.749999999999982,27],[28,23.19999999999999,23.599999999999966,29],[23.099999999999973,24.500000000000007,25.099999999999973,29,30,3.1999999999999966],[30,28.550000000000008,30.60000000000005],[23.649999999999938,31.00000000000003],[32,18.44999999999995,19.749999999999954,36],[33,31.65000000000001,36],[32.14999999999999,2.550000000000005,34],[31.900000000000055,1.7500000000000033,35],[32.2000000000001,2],[30.79999999999998,30.799999999999997,37,38,39,3.0500000000000034],[35.30000000000004,24.50000000000002,20.149999999999945,26.800000000000026],[36.34999999999998,39,40,25.950000000000014,37.249999999999986],[4,4.000000000000011,3.500000000000009,8.949999999999985,40,38,37.149999999999935],[9.699999999999996,41.64999999999985,20.500000000000036,19.65000000000001,37.65000000000002]]
  

var attacks = {}

PIXI.Loader.shared
  .add(DJANGO_STATIC_URL + "/myapp/images/map1.png")
  .add(turn1imageURL)
  .add(turn2imageURL)
  .add(turn3imageURL)
  .load(setup);

function setup() {
  // this code will run whent he loader has finished loading the image
  let map = new PIXI.Sprite(PIXI.Loader.shared.resources[DJANGO_STATIC_URL + "/myapp/images/map1.png"].texture);
  app.stage.addChild(map);

  app.renderer.autoDensity = true;
  app.renderer.resize(map.width, map.height);


  for (let i = 0; i < 40; i++) {
    markers.push(createMarker(i))
  }

  for (let i = 0; i < land_attacks.length; i++) {
    for (let j = 0; j < land_attacks[i].length; j++) {
      createAttack(i+1, land_attacks[i][j], i, j)
    }
  }
  readyButton = makeReadyButton();
  resetButton = makeResetButton();
  createPlayerReadyIndicators();
  updateReadyIndicators();
  troopCounter = initializeTroopCounter();
  //console.log(territory_troops);
  setupCombatIndicator();
  update();
}

function territoriesOwned() {
  return territory_owners.filter(x => x == PLAYER).length;
}


function setupCombatIndicator() {
  let turn1sprite = new PIXI.Sprite(PIXI.Loader.shared.resources[turn1imageURL].texture);
  let turn2sprite = new PIXI.Sprite(PIXI.Loader.shared.resources[turn2imageURL].texture);
  let turn3sprite = new PIXI.Sprite(PIXI.Loader.shared.resources[turn3imageURL].texture);

  combatIndicators = [turn1sprite, turn2sprite, turn3sprite]

  for (let i = 0; i < combatIndicators.length; i++) {
    app.stage.addChild(combatIndicators[i]);
  }
}

function updateTurnSprites() {
  console.log('in updateTurnSprites');
  for (let i = 0; i < combatIndicators.length; i++) {
    console.log(turn == i);
    combatIndicators[i].visible = (turn == i);
  }
}
  




function update() {


  //console.log('in update')
  //console.log('territory_owners')
  //console.log(territory_owners)
  //console.log('phase')
  //console.log(phase)
  //console.log('territory_troops')
  //console.log(territory_troops)



  // set territory owners
  for (let i=0; i < num_territories; i++) {
    markers[i].updateOwner(territory_owners[i]);
    console.log('available_mines')
    console.log(available_mines)
    console.log(phase)
    markers[i].interactive = (territory_owners[i] == PLAYER && (phase == 0 || (phase == 2 && available_mines > 0)));
    markers[i].buttonMode = (territory_owners[i] == PLAYER && (phase == 0 || (phase == 2 && available_mines > 0)));
    markers[i].updateTroopNum(0) // zero everything before updating
    markers[i].assignedMines = 0;
  }
  for (let i=0; i < territory_troops.length; i++) {
    t = territory_troops[i][0]
    n = territory_troops[i][1]
    markers[t-1].updateTroopNum(n)
  }

  for (var a in attacks) {
    //console.log('iterating through attacks')
    //console.log(a)
    attacks[a].updateOwner();
    attacks[a].interactive = false;
    attacks[a].buttonMode = false;
    attacks[a].visible = false;
    attacks[a].text.text = 0;
    attacks[a].assignedHorses = 0;
    attacks[a].assignedTroops = 0;
  }

  //console.log('visible_attacks');
  //console.log(visible_attacks);
  
  // set visible attacks
  visible_attacks.forEach(function ([t1,t2,s], index) {
    a = attacks[[t1,t2]]
    a.interactive = (phase == 1 || (phase == 2 && available_horses > 0 && territory_owners[t1 - 1] == PLAYER));
    a.buttonMode =  (phase == 1 || (phase == 2 && available_horses > 0 && territory_owners[t1 - 1] == PLAYER));
    a.visible = true;
    a.text.text = s;
    a.assignedTroops = s;
  })



  //console.log('updating text')
  troopCounter.updateText();
  updateTurnSprites();
  updateReadyIndicators();
}


function initializeTroopCounter() {
  let group = new PIXI.Container();
  group.troopNum = 0;

  let troopText = new PIXI.Text("");
  troopText.x = 0;
  troopText.y = -80;

  let horseText = new PIXI.Text("");
  horseText.x = 0;
  horseText.y = -40;

  let mineText = new PIXI.Text("");
  mineText.x = 0;
  mineText.y = 0;

  let opponentHorseText = new PIXI.Text("");
  opponentHorseText.x = 0;
  opponentHorseText.y = 40;

  let opponentMineText = new PIXI.Text("");
  opponentMineText.x = 0;
  opponentMineText.y = 80;
  
  group.addChild(troopText);
  group.addChild(horseText);
  group.addChild(mineText);
  group.addChild(opponentHorseText);
  group.addChild(opponentMineText);
  group.troopText = troopText;
  group.horseText = horseText;
  group.mineText = mineText;
  group.x = 1800;
  group.y = 950;
  group.available = 0;

  app.stage.addChild(group);

  group.updateText = () => {
    troopText.text = "Available troops: " + available_troops;
    horseText.text = "Available horses: " + available_horses;
    mineText.text = "Available mines: " + available_mines;
    opponentHorseText.text = "Oppponent horses: " + opponent_horses;
    opponentMineText.text = "Opponent mines: " + opponent_mines;
  }
  
  return group;
}




  

function makeReadyButton() {
  let group = new PIXI.Container();

  // TODO add border?
  let ready = new PIXI.Graphics();
  ready.beginFill(0xFFFFFF);
  ready.drawRect(0,0,200, 40)
  ready.endFill();


  let text = new PIXI.Text("Ready");
  text.x = 0;
  text.y = 0;
  text.width = 200;
  text.height = 35;
  
  group.addChild(ready);
  group.addChild(text);
  group.text = text;
  group.x = 1800;
  group.y = 750;

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

function makeResetButton() {
  let group = new PIXI.Container();

  // TODO add border?
  let reset = new PIXI.Graphics();
  reset.beginFill(0xFFFFFF);
  reset.drawRect(0,0,200, 40)
  reset.endFill();


  let text = new PIXI.Text("Reset");
  text.x = 0;
  text.y = 0;
  text.width = 200;
  text.height = 35;
  
  group.addChild(reset);
  group.addChild(text);
  group.text = text;
  group.x = 1800;
  group.y = 750 + 60;

  // TODO
  // set to true during phase 0 for acting player
  group.interactive = true;
  group.buttonMode = true;

  group
      .on('mouseup', resetClick)
      .on('touchend', resetClick)

  app.stage.addChild(group);

  return group;
}
  

function readyClick() {
  sendReadyToServer();
}
function resetClick() {
  sendResetToServer();
}

function createPlayerReadyIndicators() {
  texts = []

  for (let i = 0; i < 4; i++) {
    let circle = new PIXI.Graphics();
    circle.beginFill(playerColors[i]);
    circle.drawCircle(15,15,22)
    circle.endFill();
    circle.x = 20;
    circle.y = 200 + (60 * i);

    let text = new PIXI.Text('...');
    text.x = 20;
    text.y = 200 + (60 * i);
    texts.push(text)
    app.stage.addChild(circle)
    app.stage.addChild(text)
  }
  readyIndicators = texts
}

function updateReadyIndicators() {
  for (let i = 0; i < 4; i++) {
    console.log('updateReadyIndicators')
    console.log(player_ready)
    console.log(player_ready[i])
    if (player_ready[i] === 0) {
      readyIndicators[i].text = '...';
    } else {
      readyIndicators[i].text = 'R';
    }
  }
}
  



// creates a circle that will be colored to indicate who owns a territory
function createMarker(i) {

  let group = new PIXI.Container();
  group.troopNum = 0;
  group.assignedMines = 0;

  // TODO add border?
  let circle = new PIXI.Graphics();
  circle.beginFill(0xFFFFFF);
  circle.drawCircle(15,15,22)
  circle.endFill();

  let text = new PIXI.Text(group.troopNum);
  text.x = 0;
  text.y = 0;
  
  group.circle = circle;
  group.addChild(circle);
  group.addChild(text);
  group.text = text;
  group.i =  i;

  // set to true during phase 0 for acting player
  group.interactive = false;
  group.buttonMode = false;

  group
      .on('mouseup', markerClick)
      .on('touchend', markerClick)

  group.position.x = marker_xcoords[i];
  group.position.y = marker_ycoords[i];
  app.stage.addChild(group);

  group.updateText = () => {
    group.text.text = group.troopNum + group.assignedMines
  }

  group.updateOwner = (owner) => {
    group.circle.tint = playerColors[owner]
  }

  group.updateTroopNum = (n) => {
    group.text.text = n
    group.troopNum = n
  }
  
  return group;
}

// t1 (t2) is territory 1 (2) number, i and j are the corresponding indices into land_attacks
function createAttack(t1, t2, i, j) {
  // firs check if the (t2, t1) attack has already been proces
  if (t2 > t1 && land_attacks[t2-1].includes(t1)) {
    return
  }



  let triangle1 = new PIXI.Graphics();
  let triangle2 = new PIXI.Graphics();
  triangle1.beginFill(0xFFFFFF);
  triangle2.beginFill(0xFFFFFF);

  //Use `drawPolygon` to define the triangle as
  //a path array of x/y positions

  triangle1.lineStyle(3, 0x000000, 1);
  triangle2.lineStyle(3, 0x000000, 1);
  
  triangle1.drawPolygon([
      0, 0,               //First point
      -22, 40,            //Second point
      22, 40              //Third point
  ]);
  triangle2.drawPolygon([
      0, 0,              //First point
      44, 0,             //Second point
      22, 40,            //Third point
  ]);

  let style = new PIXI.TextStyle({
    fontSize: 22,
  })

  let text1 = new PIXI.Text(0, style);
  text1.x = -6;
  text1.y = 13;

  let text2 = new PIXI.Text(0, style);
  text2.scale.y = -1;
  text2.scale.x = -1;
  text2.x = 27;
  text2.y = 26;
  
  //Fill shape's color
  triangle1.endFill();
  triangle2.endFill();
  
  let from_t1group = new PIXI.Container();
  from_t1group.addChild(triangle1);
  from_t1group.addChild(text1);
  from_t1group.text = text1;


  let from_t2group = new PIXI.Container();
  from_t2group.addChild(triangle2);
  from_t2group.addChild(text2);
  from_t2group.text = text2;

  from_t1group.visible = false;
  from_t1group.interactive = false;
  from_t1group.buttonMode = false;
  from_t2group.visible = false;
  from_t2group.interactive = false;
  from_t2group.buttonMode = false;

  attacks[[t1,t2]] = from_t1group;
  attacks[[t2,t1]] = from_t2group;

  let group = new PIXI.Container();
  group.addChild(from_t1group);
  group.addChild(from_t2group);
  group.from_t1 = from_t1group;
  group.from_t2 = from_t2group;
  group.i = i
  group.j = j
  group.t1 = t1
  group.t2 = t2
  group.from_t1.assignedTroops = 0;
  group.from_t2.assignedTroops = 0;
  group.from_t1.assignedHorses = 0;
  group.from_t2.assignedHorses = 0;
  group.from_t1.territory = t1;
  group.from_t2.territory = t2;
  group.from_t1.updateText = () => {
    group.from_t1.text.text = group.from_t1.assignedTroops + group.from_t1.assignedHorses;
  }
  group.from_t2.updateText = () => {
    group.from_t2.text.text = group.from_t2.assignedTroops + group.from_t2.assignedHorses;
  }
  group.from_t1.updateOwner = () => {
    triangle1.tint = playerColors[territory_owners[t1-1]]
  }
  group.from_t2.updateOwner = () => {
    triangle2.tint = playerColors[territory_owners[t2-1]]
  }

  //Position the triangle after you've drawn it.
  //The triangle's x/y position is anchored to its first point in the path
  group.x = attack_xcoords[i][j];
  group.y = attack_ycoords[i][j];
  group.rotation = attack_rots[i][j];

  from_t1group
      .on('mouseup', adjustAttack)
      .on('touchend', adjustAttack)
  from_t2group
      .on('mouseup', adjustAttack)
      .on('touchend', adjustAttack)
  
  app.stage.addChild(group);
  return group;
}


requestAnimationFrame( animate );

function animate() {
  requestAnimationFrame(animate);
  app.renderer.render(app.stage);
}

function markerClick(event) {
  if (shiftKey.isDown) {
    if (phase == 0 && this.troopNum > 0) {
      this.troopNum -= 1;
      available_troops +=1;
    } else if (phase == 2 && this.assignedMines > 0) {
      this.assignedMines -= 1;
      available_mines += 1;
    }
    troopCounter.updateText();
  } else if (!shiftKey.isDown) {
    if (phase == 0 && available_troops > 0) {
      this.troopNum += 1;
      available_troops -= 1;
    } else if (phase == 2 && available_mines > 0) {
      this.assignedMines += 1;
      available_mines -= 1;
    }
    troopCounter.updateText();
    // TODO is it ever not interactive?
    if ((phase == 0 && available_troops == 0) || (phase == 2 && available_mines == 0)) {
      readyButton.interactive = true;
      readyButton.buttonMode = true;
    }
  }
  this.updateText();
}

function adjustAttack(event) {
  if (shiftKey.isDown) {
    if(phase == 1 && this.assignedTroops > 0) {
      this.assignedTroops -= 1;
      markers[this.territory-1].troopNum +=1;
      this.updateText();
      markers[this.territory-1].updateText();
    } else if (phase == 2 && this.assignedHorses > 0) {
      this.assignedHorses -= 1;
      available_horses += 1;
      this.updateText();
      troopCounter.updateText();
    }
  } else {
    if (phase == 1 && markers[this.territory - 1].troopNum > 0) {
      this.assignedTroops += 1;
      markers[this.territory-1].troopNum -=1;
      this.updateText();
      markers[this.territory-1].updateText();
    } else if (phase == 2 && available_horses > 0) {
      this.assignedHorses += 1;
      available_horses -=1;
      this.updateText();
      troopCounter.updateText();
    }
  }
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


function updateGamestate(gamestate) {
  territory_owners = gamestate.territory_owners;
  territory_troops = gamestate.territory_troops;
  visible_attacks = gamestate.visible_attacks;
  phase = gamestate.phase;
  turn = gamestate.turn;
  round = gamestate.round;
  player_ready = gamestate.player_ready;
  console.log('here updating gamestate player_ready')
  console.log(player_ready)
  pairings = gamestate.pairings;
  opponent = gamestate.opponent;
  available_troops = gamestate.available_troops;
  available_horses = gamestate.available_horses;
  available_mines = gamestate.available_mines;
  opponent_horses = gamestate.opponent_horses;
  opponent_mines = gamestate.opponent_mines;
}

function packageGamestate() {
  if (phase == 0) {
    troop_assignments = []

    // set territory owners
    for (let i=0; i < num_territories; i++) {
      if (territory_owners[i] == PLAYER) {
        troop_assignments.push([i+1, markers[i].troopNum])
      }
    }
    return JSON.stringify({troop_assignments : troop_assignments})

  } else if (phase == 1) {
    attack_strengths = []
    
    // set visible attacks
    visible_attacks.forEach(function ([t1,t2,s], index) {
      a = attacks[[t1,t2]]
      attack_strengths.push([t1, t2, parseInt(a.text.text)])
    })

    return JSON.stringify({attack_strengths: attack_strengths})
  } else if (phase == 2) {
      horse_assignments = []
      mine_assignments = []
      // set territory owners
      for (let i=0; i < num_territories; i++) {
        if (markers[i].assignedMines > 0) {
          mine_assignments.push([i+1, markers[i].assignedMines])
        }
      }
      visible_attacks.forEach(function ([t1,t2,s], index) {
        a = attacks[[t1,t2]]
        if (a.assignedHorses > 0) {
          horse_assignments.push([t1, t2, a.assignedHorses])
        }
      })
      return JSON.stringify({horse_assignments : horse_assignments, mine_assignments : mine_assignments})
  } else if (phase == 3) {
    return JSON.stringify({phase3ready: true})
  }
}  



  
  
  

function onmessage(e) {
  let message = JSON.parse(e.data);
  if ('playerReadyMessage' in message) {
    console.log('received playerReadyMessage')
    player_ready = message['playerReadyMessage']
    console.log(player_ready)
    updateReadyIndicators();
  } else {
    updateGamestate(message);
    update();
  }
};

function onclose(e) {
  console.error('Chat socket closed unexpectedly, or did not open. Reconnecting in 10 sec...');
  
  // try to reconnect in half a second. If fails, will re-call this function
  setTimeout(function() {
    chatSocket = new WebSocket(
      // TODO roomname
      'ws://'
       + window.location.host
       + '/ws/board/'
       + gameid + '/'
       + PLAYER + '/'
    );
    chatSocket.onmessage = onmessage;
    chatSocket.onclose = onclose;
    }, 10000);
};


chatSocket.onmessage = onmessage
chatSocket.onclose = onclose
chatSocket.onerror = onclose

function sendResetToServer() {
  chatSocket.send(JSON.stringify({'reset' : true}))
}


function sendReadyToServer() {
  //console.log('sending reayd')
  //console.log(packageGamestate())
  chatSocket.send(packageGamestate())
}

// taken from https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array
function isArrayInArray(arr, item){
  var item_as_string = JSON.stringify(item);

  var contains = arr.some(function(ele){
    return JSON.stringify(ele) === item_as_string;
  });
  return contains;
}
