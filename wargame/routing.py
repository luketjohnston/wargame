
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter, ChannelNameRouter
from channels.sessions import SessionMiddlewareStack
import myapp.routing
import hexgame.routing
from hexgame.consumers import GameConsumer

application = ProtocolTypeRouter({
    # (http->django views is added by default)
  'websocket': SessionMiddlewareStack(
    URLRouter(
      myapp.routing.websocket_urlpatterns + 
      hexgame.routing.websocket_urlpatterns
    ),),
  'channel': ChannelNameRouter({"game_consumer": GameConsumer}),  
})
