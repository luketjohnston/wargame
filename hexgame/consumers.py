import json
from channels.generic.websocket import WebsocketConsumer
from .models import *
from asgiref.sync import async_to_sync

class GameConsumer(WebsocketConsumer):
  def connect(self):
    self.gamename = self.scope['url_route']['kwargs']['gamename']
    print(self.gamename)
    print('self.gamename above')
    self.session_key = self.scope['session'].session_key
    game = Game.objects.get(name=self.gamename)
    self.player = Player.objects.get(key=self.session_key, game=game)
    self.room_group_name = str(Game.objects.get(name=self.gamename).id)
    
    async_to_sync(self.channel_layer.group_add)(
      self.room_group_name,
      self.channel_name,
    )

    self.accept()

  def disconnect(self, close_code):
    async_to_sync(self.channel_layer.group_discard)(
        self.room_group_name,
        self.channel_name
      )

  # receive message from websocket
  def receive(self, text_data):
    print('text_data')
    print(text_data)
    # need to make sure the 'ready' value is correct
    self.player.refresh_from_db()
    try:
      message = json.loads(text_data)
      game = Game.objects.get(name=self.gamename)
      if 'unready' in message:
        game.unready(self.player)
        # send player reset message
        async_to_sync(self.channel_layer.group_send)(
          self.room_group_name,
          { 'type': 'readies', }
        )
      if 'reset' in message:
        opp = Player.objects.get(game=game, num=message['reset'])
        tc, assignment = game.reset(self.player, opp)
        message = {}
        message['assignments'] = assignment
        message['troopUpdate'] = [[tc.opponent.num, tc.available]]
        self.send(json.dumps(message))
      if 'assignment' in message:
        message = game.processAssignment(self.player, message)
        s = json.dumps(message)
        self.send(s)
      if 'playerReady' in message:
        game.playerReady(self.player)
        if game.allReady():
          async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            { 'type': 'waitMessage', })

          game.allReadyUpdate();
          async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            { 'type': 'nextPhase', })

        else: 
          async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            { 'type': 'readies', })
    except InvalidRequest as e:
      message = {}
      message['invalid'] = str(e)
      self.send(json.dumps(message))
      


  def nextPhase(self, event):
    game = Game.objects.get(name=self.gamename)
    gamestate = game.getGamestate(self.player)
    print('IN NEXTPHASE, sending')
    print(json.dumps(gamestate))
    # game just started, need to send terrain 
    if game.phase == 0:
      self.send(json.dumps({'phase' : 0, 'board_edge_width' : game.boardEdgeWidth(), 'terrain': game.getTerrain()}))
    self.send(text_data=json.dumps(gamestate))

  def readies(self, event):
    game = Game.objects.get(name=self.gamename)
    self.send(json.dumps({'readies' : list(game.readies())}))
  def playerJoined(self, event):
    game = Game.objects.get(name=self.gamename)
    self.send(json.dumps({'playerJoined' : {'username': event['username'], 'num': event['num']}}))
    
  def waitMessage(self, event):
    self.send(json.dumps({'waitMessage': 'Resolving combat, please wait...'}))
