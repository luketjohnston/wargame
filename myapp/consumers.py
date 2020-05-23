import json
from channels.generic.websocket import WebsocketConsumer
from .models import *
from asgiref.sync import async_to_sync

class GameConsumer(WebsocketConsumer):
  def connect(self):
    self.gameid = int(self.scope['url_route']['kwargs']['gameid'])
    self.player = int(self.scope['url_route']['kwargs']['player'])
    
    async_to_sync(self.channel_layer.group_add)(
      self.gameid, # gameid is the group we're joining
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
    print("HERERERE")
    text_data_json = json.loads(text_data)
    phase = text_data_json['phase']
    gameid = text_data_json['gameid']
    player = text_data_json['player']

    # need to record that the player is ready in the database
    # then, if all players are ready, need to
    # 1. update game state
    # 2. send it to all players


    # record player ready in database
    game = Game.objects.get(gameid=gameid)
    game.player_ready = game.player_ready[:player] + '1' + game.player_ready[player+1:]
    game.save()
    print(game.player_ready);
    if game.player_ready == '1111':
      game.allReadyUpdate();

      async_to_sync(self.channel_layer.group_send)(
        self.room_group_name,
        {
          'type': 'nextPhase',
          'gameid': game.gameid
        }
      )


  def nextPhase(self, event):
    game = Game.objects.get(gameid=event['gameid'])
    gamestate = game.getGamestateContext(self.player)
    self.send(text_data=json.dumps(gamestate))
