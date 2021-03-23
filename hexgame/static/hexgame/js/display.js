import {PLAYER_COLORS} from './board.js'
import {} from './interface.js'
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

  let disp = new PIXI.Container()
  disp.x = app.renderer.width - margin - DISP_WIDTH
  disp.y = margin

  let background = new PIXI.Graphics()
  disp.addChild(background)
  app.stage.addChild(disp)


  let readyButton = makeReadyButton()
  disp.addChild(readyButton)

  disp.updateSize = () => {
    background.clear()
    background.beginFill(0x000000);
    background.alpha = 0.8;
    background.drawRect(0,0,DISP_WIDTH, app.renderer.height - 2 * margin)
    background.endFill();
    background.height = app.renderer.height - 2 * margin
    disp.x = app.renderer.width - margin - DISP_WIDTH
    disp.y = margin
    readyButton.x = DISP_WIDTH / 2 - readyButton.width / 2
    // TODO why 3 * margin? why not 2?
    readyButton.y = app.renderer.height - 3 * margin - readyButton.height
    app.renderer.render(disp)
  }

  disp.updateSize()
  let startMessage = new PIXI.Text('Waiting for game to start...')
  startMessage.x = 20
  startMessage.y = yoffset
  startMessage.style = {fill: 0xFFFFFF, font: "16px PetMe64"}
  disp.addChild(startMessage)

  disp.startGame = () => {
    startMessage.visible = false
    let t1 = new PIXI.Text('Available troops:')
    t1.x = 20
    t1.y = yoffset
    yoffset += 80
    t1.style = {fill: 0xFFFFFF, font: "16px PetMe64"}
    disp.addChild(t1)
 
    disp.troopList = []

    for (let i = 0; i < usernames.length; i++) {
      if (i == PLAYER) {
        disp.troopList.push(0)
      } else {
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
        disp.addChild(r)
        disp.addChild(indicator)
        disp.addChild(count)
        yoffset += 60

        disp.troopList.push(count)
        disp.addChild(r)
        disp.addChild(indicator)
      }
    }

    let brk = new PIXI.Graphics();
    brk.beginFill(0xFFFFFF)
    let brk_margin = margin * 2
    brk.drawRect(brk_margin,yoffset,DISP_WIDTH - 2 * brk_margin, 5)
    yoffset += 60
    brk.endFill()
    disp.addChild(brk)

    let selectMessage = new PIXI.Text('Click a border to assign troops');
    selectMessage.style = TEXT_STYLE
    selectMessage.x = 24;
    selectMessage.y = yoffset + 4 - margin;
    disp.addChild(selectMessage)

    
    let detailContainer = new PIXI.Container()
    disp.addChild(detailContainer)

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

    disp.updateText = function() {
      attacks.text = String(selectedBorder.attack_t)
      defends.text = String(selectedBorder.defend_t)
      attack_s.text = String(selectedBorder.attack_s)
      defend_s.text = String(selectedBorder.defend_t)
    }

    disp.showBorder = function(i1,j1,i2,j2) {
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
    disp.hideBorderInfo = function() {
      selectMessage.visible = true
      detailContainer.visible = false
    }
    disp.showBorderInfo = function() {
      selectMessage.visible = false
      detailContainer.visible = true
    }
    disp.updateTroops = (updateList) => {
      console.log(updateList)
      for (let [pi, t] of updateList) {
        console.log('updateTroops')
        console.log('pi')
        console.log(pi)
        console.log('t')
        console.log(t)
        disp.troopList[pi].text = String(t)
      }
    }
  }
  if (phase >= 0) {
    disp.startGame()
  }

  rightDisplay = disp
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
