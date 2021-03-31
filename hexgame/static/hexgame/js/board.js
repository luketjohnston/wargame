import {hex_indices, sheet} from './interface.js'

const BOARD_CONTAINER = new PIXI.Container()
const TILE_WIDTH = 130;
const BOARD_SPEED = 10
const PLAYER_COLORS = [0x2B7255, 0x094788, 0x8C0101, 0x9EA006, 0xEBA834, 0x9E9E9E, 0xB11FD1]
const LAKE_COLOR = 0x009EFF

const TERRAIN_TEXTURES = ['plains_final.svg', 'forest_final.svg', 'hills_final.svg', 'plains_final.svg', 'mountains_final.svg']

var territory;

function getX(i,j) {
  return j * TILE_WIDTH - i * TILE_WIDTH / 2
}
function getY(i,j) {
  return i * 3 * TILE_WIDTH / Math.sqrt(3) / 2
}

// bw = board edge width
function makeBoard(bw) {
  territory = new Array(bw * 2 - 1)
  for (let i = 0; i < territory.length; i++) {
    territory[i] = new Array(bw * 2 - 1)
  }

  for (let i=0; i < bw * 2 - 1; i++) {
    for (let j= Math.max(i - bw + 1, 0); j < Math.min(bw + i, 2 * bw - 1); j++) {
      createHex(i,j)
      hex_indices.push([i,j])
    }
  }
}

function createHex(i,j) {
    let hex = new PIXI.Graphics();
    let baseColor =  0xFFFFFF
    hex.beginFill(baseColor);
    let minX = - getX(BOARD_EDGE_WIDTH-1, 0)
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
      if (owner === null || owner == -1) {
        hex.tint = LAKE_COLOR
      } else {
        hex.tint = PLAYER_COLORS[owner]
      }
      hex.owner = owner
    }
    territory[i][j] = hex
    hex.setTerrain = (t) => {
      hex.terrain = t
      console.log("set terrain")
      console.log(t)
      if (t == 0) {
        hex.tint = LAKE_COLOR
      } else {
        let tex = sheet.textures[TERRAIN_TEXTURES[t]]
        let s = PIXI.Sprite.from(tex)
        s.scale.set(0.13,0.13)
        s.x = hex.width / 2 - s.width / 2
        s.y = hex.height/2 - s.height / 2
        hex.addChild(s)
      }
    }
      
    BOARD_CONTAINER.addChild(hex)
   
}

export {makeBoard, LAKE_COLOR, TILE_WIDTH, BOARD_SPEED, BOARD_CONTAINER, territory, createHex, PLAYER_COLORS, getX, getY}
