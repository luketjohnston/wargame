import {PLAYER_COLORS} from './board.js'
import {availableTroops} from './interface.js'
import {readyMessage} from './messaging.js'
import {selectedBorder} from './borders.js'

const TEXT_STYLE = new PIXI.TextStyle({
  font: "PetMe64",
  fill: "white",
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowAngle: '0',
});
const DISP_WIDTH = 400;
var rightDisplay;

function makeRightDisplay(app) {
  let margin = 20
  let yoffset = 20
  let xoffset = 20

  let dispRect = new PIXI.Graphics()
  dispRect.beginFill(0x000000);
  dispRect.drawRect(0,0,DISP_WIDTH, app.renderer.height - 2 * margin)
  dispRect.x = app.renderer.width - DISP_WIDTH - margin
  dispRect.y = margin
  dispRect.endFill();
  dispRect.alpha = 0.9;
  app.stage.addChild(dispRect)

  let t1 = new PIXI.Text('Available troops:')
  t1.x = 20
  t1.y = yoffset
  yoffset += 80
  t1.style = {fill: 0xFFFFFF, font: "16px PetMe64"}
  dispRect.addChild(t1)
 
  dispRect.troopList = []

  for (let i = 0; i < usernames.length; i++) {
    let r = new PIXI.Graphics();
    r.beginFill(PLAYER_COLORS[i]);
    r.drawRect(20,yoffset - margin,35,35)
    r.endFill();
    let indicator = new PIXI.Text('p' + String(i + 1));
    indicator.x = 24;
    indicator.y = yoffset + 4 - margin;

    let count = new PIXI.Text('');
    count.style = TEXT_STYLE
    count.x = 90;
    count.y = yoffset + 4 - margin;
    dispRect.addChild(r)
    dispRect.addChild(indicator)
    dispRect.addChild(count)
    yoffset += 60

    dispRect.troopList.push(count)
    dispRect.addChild(r)
    dispRect.addChild(indicator)
  }

  let brk = new PIXI.Graphics();
  brk.beginFill(0xFFFFFF)
  let brk_margin = margin * 2
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
    let t = new PIXI.Text(txt)
    t.x = 20
    t.y = yoffset
    t.style = TEXT_STYLE

    let v = new PIXI.Text('0')
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

  let attacks = newDescriptor('Assigned attacking troops:', 0)
  let defends = newDescriptor('Assigned defending troops:', 1)
  let attack_s = newDescriptor('Total attacking strength:', 2)
  let defend_s = newDescriptor('Total defending strength:', 3)

  dispRect.updateText = function() {
    attacks.text = String(selectedBorder.attack_t)
    defends.text = String(selectedBorder.defend_t)
    attack_s.text = String(selectedBorder.attack_s)
    defend_s.text = String(selectedBorder.defend_t)
  }

  dispRect.showBorder = function(i1,j1,i2,j2) {
    selectMessage.visible = false
    border = borders[i1][j1][i2][j2]
    detailContainer.setAttacks(border.attack_t)
    detailContainer.setDefends(border.defend_t)
    as = getAttackStrength(i1,j1,i2,j2)
    ds = getDefendStrength(i1,j1,i2,j2)
    detailContainer.setAttackStrength(as)
    detailContainer.setDefendStrength(ds)
    detailContainer.visible = true
  }
  dispRect.hideBorderInfo = function() {
    selectMessage.visible = true
    detailContainer.visible = false
  }
  dispRect.showBorderInfo = function() {
    selectMessage.visible = false
    detailContainer.visible = true
  }
  dispRect.updateTroops = (updateList) => {
    for (let [pi, t] of updateList) {
      dispRect.troopList[pi].text = String(t)
    }
  }
      
    


  let readyButton = makeReadyButton()
  readyButton.x = 20
  readyButton.y = yoffset
  dispRect.addChild(readyButton)


  rightDisplay = dispRect
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

  group.interactive = true;
  group.buttonMode = true;

  group
      .on('mouseup', readyClick)
      .on('touchend', readyClick);

  return group
}

function readyClick() {
  readyMessage();
}

export {rightDisplay, makeRightDisplay}
