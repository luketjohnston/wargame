from django.urls import path

from . import views

app_name = 'hexgame'
urlpatterns = [
  path('', views.index, name='index'),
  path('board/<str:gamename>/', views.board, name='board'),
  # TODO remove  position view
  path('position/', views.position, name='position'),
  path('gamelist/', views.gamelist, name='gamelist'),
  path('createGame/', views.createGame, name='createGame'),
  path('joinGame/<str:gamename>/', views.joinGame, name='joinGame'),
  path('quickPlay/', views.quickPlay, name='quickPlay'),

]
