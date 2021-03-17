
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import myapp.routing
import hexgame.routing

application = ProtocolTypeRouter({
    # Empty for now (http->django views is added by default)
  'websocket': AuthMiddlewareStack(
    URLRouter(
      myapp.routing.websocket_urlpatterns + 
      hexgame.routing.websocket_urlpatterns
    )
  ),
})
