



let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

PIXI.utils.sayHello(type)


let app = new PIXI.Application({width: 256, height: 256});
var markers = [];
var assigners = [];

// used to rotate attack markers
var selected;

document.body.appendChild(app.view);

let leftKey = keyboard("j");
let rightKey = keyboard("k");
let saveKey = keyboard("s");



// TODO store in database so easier to modify?

var marker_xcoords = [195,337,447,539,519,693,687,901,1075,1121,1252,1342,1836,1772,1588,1488,1586,1379,1347,1546,219,435,739,1061,1137,1102,1444,1472,1615,1779,513,537,264,240,164,778,967,1099,938,1128]
var marker_ycoords = [1616,1331,1072,897,1471,1210,979,1449,1278,1045,1245,1438,1485,1300,1353,1153,988,903,679,695,126,138,250,261,471,124,283,395,255,376,337,595,636,925,1091,581,331,659,884,754]

// non overlapping numbers
//var marker_xcoords = [225,375,477,616,543,742,734,864,1138,1174,1320,1445,1903,1832,1639,1462,1628,1431,1365,1618,286,423,782,1135,1203,1179,1497,1524,1686,1848,570,568,333,299,238,845,1010,983,909,1191]
//var marker_ycoords = [1477,1402,1010,893,1379,1282,1037,1385,1329,1114,1196,1453,1490,1318,1308,1005,1131,868,743,669,101,216,304,233,428,93,237,444,273,364,297,653,620,907,1104,586,461,652,812,918]

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


console.log('here');
console.log(DJANGO_STATIC_URL);
console.log('here');

PIXI.Loader.shared.add(DJANGO_STATIC_URL + "/myapp/images/map1.png").load(setup);

function setup() {
  // this code will run whent he loader has finished loading the image
  let map = new PIXI.Sprite(PIXI.Loader.shared.resources[DJANGO_STATIC_URL + "/myapp/images/map1.png"].texture);
  app.stage.addChild(map);

  app.renderer.autoDensity = true;
  app.renderer.resize(map.width, map.height);


  for (let i = 0; i < 40; i++) {
    markers.push(createMarker(i));
  }

  for (let i = 0; i < land_attacks.length; i++) {
    for (let j = 0; j < land_attacks[i].length; j++) {
      createAttack(i+1, land_attacks[i][j], i, j);
    }
  }

  app.ticker.add(delta => gameLoop(delta));
}


function gameLoop(delta) {
  if (leftKey.isDown) {
    selected.rotation += 0.05;
    attack_rots[selected.i][selected.j] = selected.rotation;
  }
  if (rightKey.isDown) {
    selected.rotation -= 0.05;
    attack_rots[selected.i][selected.j] = selected.rotation;
  }
  if (saveKey.isDown) {
    console.log(JSON.stringify(attack_xcoords))
    console.log(JSON.stringify(attack_ycoords))
    console.log(JSON.stringify(attack_rots))
  }
}
  


// creates a circle that will be colored to indicate who owns a territory
function createMarker(i) {
  // TODO add border?
  let marker = new PIXI.Graphics();
  marker.beginFill(0x9966FF);
  marker.drawCircle(15,15,22)
  marker.endFill();


  let text = new PIXI.Text(i + 1);
  text.x = 0;
  text.y = 0;
  
  
  let group = new PIXI.Container();
  group.addChild(marker);
  group.addChild(text);



  group.interactive = true;
  group.buttonMode = true;

  group
      // events for drag start
      .on('mousedown', onDragStart)
      .on('touchstart', onDragStart)
      // events for drag end
      .on('mouseup', onDragEnd)
      .on('mouseupoutside', onDragEnd)
      .on('touchend', onDragEnd)
      .on('touchendoutside', onDragEnd)
      // events for drag move
      .on('mousemove', onDragMove)
      .on('touchmove', onDragMove);
       

  group.position.x = marker_xcoords[i];
  group.position.y = marker_ycoords[i];
  app.stage.addChild(group);

  
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
  triangle1.beginFill(0x666666);
  triangle2.beginFill(0x666666);

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

  let text1 = new PIXI.Text(t1, style);
  text1.x = -6;
  text1.y = 13;

  let text2 = new PIXI.Text(t2, style);
  text2.scale.y = -1;
  text2.scale.x = -1;
  text2.x = 27;
  text2.y = 26;




  
  //Fill shape's color
  triangle1.endFill();
  triangle2.endFill();
  

  let group = new PIXI.Container();
  group.addChild(triangle1);
  group.addChild(triangle2);
  group.addChild(text1);
  group.addChild(text2);
  group.i = i
  group.j = j
  group.t1 = t1
  group.t2 = t2

  //Position the triangle after you've drawn it.
  //The triangle's x/y position is anchored to its first point in the path
  group.x = attack_xcoords[i][j];
  group.y = attack_ycoords[i][j];
  group.rotation = attack_rots[i][j];

  group.interactive = true;
  group.buttonMode = true;

  group
      // events for drag start
      .on('mousedown', onDragStart)
      .on('touchstart', onDragStart)
      // events for drag end
      .on('mouseup', onDragEndAttack)
      .on('mouseupoutside', onDragEndAttack)
      .on('touchend', onDragEndAttack)
      .on('touchendoutside', onDragEndAttack)
      // events for drag move
      .on('mousemove', onDragMove)
      .on('touchmove', onDragMove);
  
  app.stage.addChild(group);
}
  
  






requestAnimationFrame( animate );

function animate() {
  requestAnimationFrame(animate);
  app.renderer.render(app.stage);
}

function onDragStart(event) {
  this.data = event.data;
  this.alpha = 0.5;
  this.dragging = true;
  selected = this;
}

function onDragEnd() {
  this.alpha = 1;
  this.dragging = false;
  this.data = null;

  console.log(markers)
  for (let i = 0; i < 40; i++) {
    marker_xcoords[i] = markers[i].position.x;
    marker_ycoords[i] = markers[i].position.y;
  }

  console.log(JSON.stringify(marker_xcoords))
  console.log(JSON.stringify(marker_ycoords))
}

function onDragEndAttack() {
  this.alpha = 1;
  this.dragging = false;
  this.data = null;

  attack_xcoords[this.i][this.j] = this.position.x;
  attack_ycoords[this.i][this.j] = this.position.y;

}

function onDragMove() {
  if (this.dragging) {
    var newPosition = this.data.getLocalPosition(this.parent);
    this.position.x = newPosition.x;
    this.position.y = newPosition.y;
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

