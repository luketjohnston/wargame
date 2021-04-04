import json
import jsonpickle
from channels.generic.websocket import WebsocketConsumer
from .models import *
from .game import InvalidRequest
from asgiref.sync import async_to_sync

class GameConsumer(WebsocketConsumer):
  def connect(self):
    self.gamename = self.scope['url_route']['kwargs']['gamename']
    gq = GameFile.objects.filter(name=self.gamename)
    self.username = "TODO"
    self.invalid = False
    self.accept()
    if gq:
      self.model = gq[0]
      self.game = self.model.getGame()
      self.id = self.model.id
    else:
      self.invalid = True
      self.send(json.dumps({'invalid': 'That game doesn\'t exist!'}))
      self.close()
      return
    self.room_group_name = str(self.model.id)

    self.session_key = self.scope['session'].session_key
    try:
      self.player = self.game.getPlayer(self.session_key)
    except InvalidRequest as e:
      self.send(json.dumps({'invalid': 'you havent joined this game'}))

    # TODO what happens if multiple windows opened with same session?
    # will there be multiple controllers?

    self.controller_group = GameConsumer.staticControllerGroup(self.id)

    if self.isController():
      async_to_sync(self.channel_layer.group_add)(
        self.controller_group,
        self.channel_name,
      )

    print('room group name: ') 
    print(self.room_group_name) 
    
    async_to_sync(self.channel_layer.group_add)(
      self.room_group_name,
      self.channel_name,
    )
    async_to_sync(self.channel_layer.group_add)(
      self.playerGroup(self.player),
      self.channel_name,
    )

    gamestate = self.game.getGamestate(self.player)
    if self.game.phase >= 0:
      gamestate['board_edge_width'] = self.game.bew
      gamestate['terrain'] = self.game.getAllTerrain()

    self.send(text_data=json.dumps(gamestate))
    
    # request readies from the controller
    async_to_sync(self.channel_layer.group_send)(
      self.controller_group,
      {'type': 'processMessage',
       'requestReadies': None,
       'player':self.player}
      )



  def playerGroup(self, i):
    return str(self.id) + '_player_' + str(i)
  def gameGroup(self):
    return str(self.id)
  def controllerGroup(self):
    return self.controller_group

  def staticControllerGroup(game_id):
    return str(game_id) + '_controller'
  def staticGameGroup(game_id):
    return str(game_id)

  def isController(self):
    return self.player == 0

  def disconnect(self, close_code):
    if not self.invalid:
      async_to_sync(self.channel_layer.group_discard)(
          self.room_group_name,
          self.channel_name
        )

  # receive message from websocket
  def receive(self, text_data):
    if self.isController():
      self.processMessage(
        {'text_data':text_data,
         'player':self.player}
        )
    else:
      async_to_sync(self.channel_layer.group_send)(
        self.controller_group,
        {'type': 'processMessage',
         'text_data':text_data,
         'player':self.player}
        )
        

  def processMessage(self, event):
    assert self.isController()

    if 'text_data' in event:
      message = json.loads(event['text_data'])
    player = event['player']
    game = self.game
    response = {}
    response['type'] = 'update'
    response_group = self.playerGroup(player)

    try:
      if 'requestReadies' in event:
        response['readies'] = game.readies
      elif 'unready' in message:
        game.unreadyPlayer(player)
        # send player reset message
        response_group = self.gameGroup()
        response['readies'] = game.readies
      elif 'reset' in message:
        opp = message['opp']
        troopUpdate, assignment = game.reset(player, opp)
        response['assignments'] = assignment
        response['troopUpdate'] = troopUpdate
      elif 'assignment' in message:
        troopUpdate, assignments = game.processAssignment(player, message['assignment'])
        response['assignments'] = assignments
        response['troopUpdate'] = troopUpdate
      elif 'playerReady' in message:
        response_group = self.gameGroup()
        game.readyPlayer(player)
        if game.allReady():
          # TODO can we send a response instantly, indicating server is 
          # processing?
          game.allReadyUpdate();
          self.model.saveGame(game)
          response['type'] = 'nextPhase'
          response['game'] = jsonpickle.encode(game)
        else: 
          response['readies'] = game.readies

      async_to_sync(self.channel_layer.group_send)(
        response_group,
        response
      )
    except InvalidRequest as e:
      response = {}
      response['invalid'] = str(e)
      response['type'] = 'update'
      async_to_sync(self.channel_layer.group_send)(
        self.playerGroup(player),
        response
      )

  def getGameFromFile(self):
    gq = GameFile.objects.get(name=self.gamename)
    return gq.getGame()
      
  def playerAdded(self, event):
    game = self.getGameFromFile()
    if self.isController():
      self.game = game
    self.send(json.dumps({'usernames': game.usernames}))
    

  def update(self, event):
    self.send(json.dumps(event))

  def nextPhase(self, event):
    game = jsonpickle.decode(event['game'])
    gamestate = game.getGamestate(self.player)
    # game just started, need to send terrain and board edge width
    if game.phase == 0:
      gamestate['board_edge_width'] = game.bew
      gamestate['terrain'] = game.getAllTerrain()
    self.send(text_data=json.dumps(gamestate))
  def readies(self, event):
    self.send(json.dumps({'readies' : event['readies']}))
  def playerJoined(self, event):
    self.send(json.dumps({'playerJoined' : {'username': event['username'], 'num': event['player']}}))
  def waitMessage(self, event):
    self.send(json.dumps({'waitMessage': 'Resolving combat, please wait...'}))
