from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
  re_path(r'ws/board/(?P<gameid>\d+)/(?P<player>\d+)/$', consumers.GameConsumer),
]

