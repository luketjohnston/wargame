
const BOARD_CONTAINER = new PIXI.Container()
const BOARD_EDGE_WIDTH = 6
const TILE_WIDTH = 130;
const BOARD_SPEED = 10
const PLAYER_COLORS = [0x2B7255, 0x094788, 0x8C0101, 0x9EA006, 0xEBA834, 0x9E9E9E, 0xB11FD1]

var territory = new Array(BOARD_EDGE_WIDTH * 2 - 1)
for (let i = 0; i < territory.length; i++) {
  territory[i] = new Array(BOARD_EDGE_WIDTH * 2 - 1)
}

function getX(i,j) {
  return j * TILE_WIDTH - i * TILE_WIDTH / 2
}
function getY(i,j) {
  return i * 3 * TILE_WIDTH / Math.sqrt(3) / 2
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
      hex.tint = PLAYER_COLORS[owner]
      hex.owner = owner
    }
    territory[i][j] = hex
    BOARD_CONTAINER.addChild(hex)
}

export {BOARD_EDGE_WIDTH, TILE_WIDTH, BOARD_SPEED, BOARD_CONTAINER, territory, createHex, PLAYER_COLORS, getX, getY}
