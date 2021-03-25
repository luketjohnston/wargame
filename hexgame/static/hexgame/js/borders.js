import {BOARD_CONTAINER, BOARD_EDGE_WIDTH, TILE_WIDTH, territory, getX, getY } from './board.js'
import {rightDisplay} from './display.js'
import {vecFromPolar} from './utils.js'
import {sheet} from './interface.js'

const BORDER_FILTER = new PIXI.filters.AlphaFilter();
BORDER_FILTER.alpha = 0.1;
const BORDER_CONT = new PIXI.Container();
BORDER_CONT.filters = [BORDER_FILTER];
const BORDER_WIDTH = 25
var selectedBorder;


var borders = new Array(BOARD_EDGE_WIDTH * 2 - 1);
for (let i = 0; i < borders.length; i++) {
  borders[i] = new Array(BOARD_EDGE_WIDTH * 2 - 1)
  for (let j = 0; j < borders[i].length; j++) {
    borders[i][j] = new Array(3)
    for (let di = 0; di < 3; di ++) {
      borders[i][j][di] = new Array(3)
    }
  }
}


function makeBorder(i1,j1,i2,j2) {

    let dx = getX(i2,j2) - getX(i1,j1)
    let dy = getY(i2,j2) - getY(i1,j1)

    // some math to figure out point coordinates
    // should probably just use sprites instead of all this garbage
    let radius = TILE_WIDTH / Math.sqrt(3)
    let ytemp = Math.sin(Math.PI/6) * (radius) - BORDER_WIDTH * Math.cos(Math.PI/6)
    let xtemp = TILE_WIDTH / 2
    let radinc = 2 * Math.PI/6 - Math.atan(ytemp / xtemp)
    let dist2 = Math.sqrt(ytemp * ytemp + xtemp * xtemp)

    let theta = Math.atan2(dy,dx)

    let border = new PIXI.Graphics();
    border.theta = theta
    let baseColor =  0x000000
    border.beginFill(baseColor);
    let minX = - getX(BOARD_EDGE_WIDTH-1, 0)
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
    selection.alpha = 1
    selection.visible = false


    border.hitArea = new PIXI.Polygon(path2);
    border.ijij = [i1,j1,i2,j2]
    border.alpha = 1
    let click = function() {
      if (selectedBorder !== undefined) {
        selectedBorder.selection.visible = false
      }

      if (territory[i1][j1].owner == PLAYER) {
        selectedBorder = border
        selectedBorder.selection.visible = true
        rightDisplay.showBorderInfo()
        rightDisplay.updateText()
      }
      
    }
    let mouseover = function() {
      if (selectedBorder === undefined &&
          territory[i1][j1].owner == PLAYER) {
        selection.visible = true
      }
    }
    let mouseout = function() {
      if (selectedBorder === undefined) {
        selection.visible = false
      }
    }      
    border.selection = selection

    border
      .on('mouseup', click)
      .on('touchend', click)
      .on('mouseupoutside', click)
      .on('touchendoutside', click)
      .on('mouseover', mouseover)
      .on('mouseout', mouseout)

    border.troopContainer = new PIXI.Container()
    BOARD_CONTAINER.addChild(border.troopContainer)

    border.attack_t = 0
    border.defend_t = 0
    border.attack_s = 0
    border.defend_s = 0
    border.update = (attack,defend,as,ds) => {
      border.attack_t = attack
      border.defend_t = defend
      border.attack_s = as
      border.defend_s = ds
      if (selectedBorder === border) {
        rightDisplay.updateText()
      }
      updateTroopDisplay(border)
    }

    borders[i1][j1][i2-i1 + 1][j2-j1 + 1] = border;
    BORDER_CONT.addChild(border)
    BOARD_CONTAINER.addChild(selection)
    return border
}

function updateBorderVisibles(territory, hex_indices) {
  let d_coords = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1]]
  for (let [i,j] of hex_indices) {
    for (let [di,dj] of d_coords) {
      let b = borders[i][j][di+1][dj+1]
      let v = territory[i+di] === undefined || territory[i+di][j+dj] === undefined || territory[i+di][j+dj].owner != territory[i][j].owner
      b.visible = v
      if (territory[i][j].terrain == 0) {
        b.visible = false
      }
    }
  }
}


function makeAllBorders(hex_indices) {
  let d_coords = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1]]
  for (let [i,j] of hex_indices) {
    for (let [di,dj] of d_coords) {
      let b = makeBorder(i,j,i+di,j+dj)
      updateTroopDisplay(b)
    }
  }
}

function zeroAllBorders(hex_indices) {
  let d_coords = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1]]
  for (let [i,j] of hex_indices) {
    for (let [di,dj] of d_coords) {
      borders[i][j][di+1][dj+1].update(0,0,0,0)
    }
  }
}
  
  

function unselectBorder() {
  selectedBorder.selection.visible = false
  selectedBorder = undefined
  rightDisplay.hideBorderInfo()
}

function updateTroopDisplay(border) {
  let cont = border.troopContainer
  cont.removeChildren()
  cont.x = border.x
  cont.y = border.y

  let SHOW_STRENGTH = true
  let SHOW_TROOP = true
  var def_lim;
  var att_lim;
  var trp_lim;
  if (SHOW_STRENGTH) {
    def_lim = border.defend_s
    att_lim = border.attack_s
  } else {
    def_lim = border.defend_t
    att_lim = border.attack_t
  }
  if (SHOW_TROOP) {
    trp_lim = border.attack_t + border.defend_t
  } else {
    trp_lim = 0
  }

  let ICON_XLIM = TILE_WIDTH / 7.6

  let setIcons = (makeGraphic, lim, yshift) => {
    for (let i = 0; i < lim; i++) {
      let s = makeGraphic()
      if (lim > 1) {
        let minx = - ICON_XLIM  - s.width / 2
        let maxx =   ICON_XLIM - s.width / 2
        s.x = minx + i * (maxx  - minx) / (lim - 1)
      } else {
        s.x = -s.width / 2   
      }
      s.y = - TILE_WIDTH / 2 + s.height / 2 + yshift * (s.height)
      cont.addChild(s)
    }
  }

  let makeSword = () => {
    let s = PIXI.Sprite.from(sheet.textures["sword1.png"])
    s.scale.set(0.1,0.1)
    return s
  }
  let makeShield = () => {
    let s = PIXI.Sprite.from(sheet.textures["shield1.png"])
    s.scale.set(0.1,0.1)
    return s
  }
  let makeTroop = () => {
    let trp = new PIXI.Graphics()
    trp.beginFill(0x000000)
    let r = 8
    trp.drawCircle(r,r,r)
    trp.endFill()
    return trp
  }

  setIcons(makeShield, def_lim, 0)
  setIcons(makeTroop, trp_lim, 1)
  setIcons(makeSword,  att_lim, -0.5)

  cont.rotation = (border.theta + Math.PI / 2)
  
}
         
  

export {borders, BORDER_CONT, selectedBorder, unselectBorder, updateBorderVisibles, makeAllBorders, zeroAllBorders}

