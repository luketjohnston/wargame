import json
from channels.generic.websocket import WebsocketConsumer
from .models import *
from asgiref.sync import async_to_sync

class GameConsumer(WebsocketConsumer):
  def connect(self):
    self.gameid = int(self.scope['url_route']['kwargs']['gameid'])
    self.player = int(self.scope['url_route']['kwargs']['player'])
    self.room_group_name = str(self.gameid)
    
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
    print('receiving data')
    print(text_data)
    message = json.loads(text_data)
    game = Game.objects.get(gameid=self.gameid)
    print("here, printing message")
    print(message)
    if 'reset' in message:
      game.processResetMessage(self.player)
      # send player reset message
      async_to_sync(self.channel_layer.group_send)(
        self.room_group_name,
        {
          'type': 'playerReset',
          'player': self.player,
        }
      )
      return

    game.processReadyMessage(self.player, message)
    print(game.player_ready)

    if game.allReady():
      game.allReadyUpdate();

      async_to_sync(self.channel_layer.group_send)(
        self.room_group_name,
        {
          'type': 'nextPhase',
        }
      )
    else:
      # send player ready message
      async_to_sync(self.channel_layer.group_send)(
        self.room_group_name,
        {
          'type': 'playerReady',
          'player': self.player,
        }
      )


  def nextPhase(self, event):
    print('in next phase');
    game = Game.objects.get(gameid=self.gameid)
    gamestate = game.getGamestateContext(self.player)
    self.send(text_data=json.dumps(gamestate))

  def playerReset(self, event):
    game = Game.objects.get(gameid=self.gameid)
    if event['player'] == self.player:
      gamestate = game.getGamestateContext(self.player)
      self.send(text_data=json.dumps(gamestate))
    else:
      # for other players, just need to indicate this player isn't ready
      self.send(json.dumps({'playerReadyMessage' : [int(game.player_ready[i] == '1') for i in range(4)]}))

  def playerReady(self, event):
    game = Game.objects.get(gameid=self.gameid)
    self.send(json.dumps({'playerReadyMessage' : [int(game.player_ready[i] == '1') for i in range(4)]}))
    
