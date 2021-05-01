from celery import Celery
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import hexgame.consumers as consumersModule


app = Celery('hexgame', broker='redis://localhost')

# sends a message to the game controller consumer to 
# advance the game corresponding to 'gamename' beyond phase 'phase'
@app.task
def nextPhase(gamename, phase):
  async_to_sync(get_channel_layer().send)(
    'game_consumer',
    {'type': 'timeIsUp',
     'gamename': gamename,
     'phase': phase}
  )
