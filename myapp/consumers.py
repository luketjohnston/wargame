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

    # need to record that the player is ready in the database
    # then, if all players are ready, need to
    # 1. update game state
    # 2. send it to all players


    # record player ready in database
    game = Game.objects.get(gameid=self.gameid)
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


  def nextPhase(self, event):
    print('in next phase');
    game = Game.objects.get(gameid=self.gameid)
    gamestate = game.getGamestateContext(self.player)
    self.send(text_data=json.dumps(gamestate))
