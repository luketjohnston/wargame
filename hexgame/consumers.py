import json
import jsonpickle
from channels.generic.websocket import WebsocketConsumer
from channels.consumer import SyncConsumer, AsyncConsumer
from .models import *
from asgiref.sync import async_to_sync, sync_to_async

class InvalidRequest(Exception):
  pass
class GameTerminated(Exception):
  pass

class GameConsumer(SyncConsumer):

  def getGameModel(self, event):
    gamename = event['gamename']
    gq = GameFile.objects.filter(name=gamename)
    if not gq: raise GameTerminated
    model = gq[0]
    return model

  def sendErrorMessage(self, gamename, session_key, message):
    playerGroup = getPlayerGroup(gamename, session_key)
    async_to_sync(self.channel_layer.group_send)(
      playerGroup,
      {'type': errorMessage,
       'message': message})


  def playerJoined(self, event):
    session_key = event['session_key']
    gamename = event['gamename']
    try:
      model = self.getGameModel(event)
    except GameTerminated:
      response = {}
      response['type'] = 'update'
      response['terminated'] = 'Game does not exist!'
      response_group = getPlayerGroup(gamename, session_key)
      async_to_sync(self.channel_layer.group_send)(
        response_group,
        response
      )
      return
    game = model.getGame()

    try:
      player = game.getPlayer(session_key)
    except InvalidRequest as e:
      playerGroup = getPlayerGroup(gamename, session_key)
      async_to_sync(self.channel_layer.group_send)(
        playerGroup,
        {'type': errorMessage,
         'message': 'You haven\'t joined this game!'})
      return


    # send usernames to all players 
    async_to_sync(self.channel_layer.group_send)(
      getGameGroup(gamename),
      {'type': 'update',
       'usernames': game.usernames})

    # send gamestate info to player who just joined
    gamestate = game.getGamestate(player)
    if game.phase >= 0:
      gamestate['board_edge_width'] = game.bew
      gamestate['terrain'] = game.getAllTerrain()
  
    async_to_sync(self.channel_layer.group_send)(
      getPlayerGroup(gamename, session_key),
      {'type': 'update',
       'gamestate': gamestate})

  def timeIsUp(self, event):
    model = self.getGameModel(event)
    game = model.getGame()
    if game.phase == event['phase']:
      try:
        game.allReadyUpdate();
        response = {}
        response['type'] = 'nextPhase'
        response['game'] = jsonpickle.encode(game)
        response_group = getGameGroup(event['gamename'])
        async_to_sync(self.channel_layer.group_send)(
          response_group,
          response
        )
        model.saveGame(game)
      except GameTerminated:
        model.cleanupGame()
        response = {}
        response['type'] = 'update'
        response['terminated'] = 'Game terminated due to no human-player troop assignments.'
        response_group = getGameGroup(event['gamename'])
        async_to_sync(self.channel_layer.group_send)(
          response_group,
          response
        )
        

  def processMessage(self, event):
    print('processMessage: ')
    print(event)
    if 'text_data' in event:
      message = json.loads(event['text_data'])
    try:
      model = self.getGameModel(event)
    except GameTerminated:
      response = {}
      response['type'] = 'update'
      response['terminated'] = 'Game does not exist!'
      response_group = getGameGroup(event['gamename'])
      async_to_sync(self.channel_layer.group_send)(
        response_group,
        response
      )
      return
      
    game = model.getGame()
    session_key = event['session_key']
    gamename = event['gamename']
    response = {}
    response['type'] = 'update'
    response_group = getPlayerGroup(gamename, session_key)

    try:
      player = game.getPlayer(session_key)
      if 'requestReadies' in event:
        response['readies'] = game.readies
      elif 'addAI' in message:
        game.addAI()
        response['usernames'] = game.usernames
        response['readies'] = game.readies
        model.saveGame(game)
      elif 'unready' in message:
        game.unreadyPlayer(player)
        # send player reset message
        response_group = getGameGroup(gamename)
        response['readies'] = game.readies
        model.saveGame(game)
      elif 'reset' in message:
        print('in reset')
        print(message)
        opp = message['reset']
        troopUpdate, assignment = game.reset(player, opp)
        response['troopUpdate'] = troopUpdate
        response['assignments'] = assignment
        model.saveGame(game)
      elif 'assignment' in message:
        troopUpdate, assignments = game.processAssignment(player, message['assignment'])
        response['assignments'] = assignments
        response['troopUpdate'] = troopUpdate
        model.saveGame(game)
      elif 'playerReady' in message:
        response_group = getGameGroup(gamename)
        game.readyPlayer(player)
        if game.allReady():
          game.allReadyUpdate();
          response['type'] = 'nextPhase'
          response['game'] = jsonpickle.encode(game)
        else: 
          response['readies'] = game.readies
        model.saveGame(game)

      async_to_sync(self.channel_layer.group_send)(
        response_group,
        response
      )
    except InvalidRequest as e:
      response = {}
      response['type'] = 'update'
      response['invalid'] = str(e)
      async_to_sync(self.channel_layer.group_send)(
        getPlayerGroup(gamename, session_key),
        response
      )

def getPlayerGroup(gamename, session_key):
  return str(gamename) + '_player_' + str(session_key)
def getGameGroup(gamename):
  return str(gamename) + '_game'
    

class PlayerConsumer(WebsocketConsumer):
  def connect(self):
    self.gamename = self.scope['url_route']['kwargs']['gamename']
    self.session_key = self.scope['session'].session_key
    self.username = "TODO"
    self.accept()

    async_to_sync(self.channel_layer.group_add)(
      self.gameGroup(),
      self.channel_name,
    )
    async_to_sync(self.channel_layer.group_add)(
      getPlayerGroup(self.gamename, self.session_key),
      self.channel_name,
    )
    async_to_sync(self.channel_layer.send)(
      'game_consumer',
      {'type': 'playerJoined',
       'gamename': self.gamename,
       'session_key' : self.session_key}
      )

  def gameGroup(self):
    return getGameGroup(self.gamename)

  def disconnect(self, close_code):
    async_to_sync(self.channel_layer.group_discard)(
        self.gameGroup(),
        self.channel_name
      )
    # TODO: add playerDisconnect handling, maybe send info to client
    # about what players are connected currently?
    #async_to_sync(self.channel_layer.send)(
    #    'game_consumer',
    #    {'type': 'playerDisconnect',
    #     'gamename': self.gamename,
    #    'session_key': self.session_key,}
    #  )

    

  # receive message from websocket
  def receive(self, text_data):
    # just forward the message to game_consumer (the game controller)
    async_to_sync(self.channel_layer.send)(
      'game_consumer',
      {'type': 'processMessage',
       'text_data':text_data,
       'gamename': self.gamename,
       'session_key':self.session_key}
      )

  def errorMessage(self, event):
    self.send(json.dumps(event['message']))
      
  def update(self, event):
    print('event')
    print(event)
    self.send(json.dumps(event))

  def nextPhase(self, event):
    game = jsonpickle.decode(event['game'])
    player = game.getPlayer(self.session_key)
    gamestate = game.getGamestate(player)
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
