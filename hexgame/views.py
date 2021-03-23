from django.shortcuts import render, redirect
from django.core.exceptions import ObjectDoesNotExist

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


from django.http import HttpResponse
from hexgame.models import *

# Create your views here.

def index(request):
  return HttpResponse("Hello, world. You're at the index.")

def board(request, gamename):

  key = request.session.session_key
  
  try:
    game = Game.objects.get(name=gamename)
  except ObjectDoesNotExist:
    game = Game(gamename);
    game.save();
  player = Player.objects.get(key=key,game=game)
  context = game.getGamestateContext(player);

  return render(request, 'hexgame/board.html', context)

def position(request):
  return render(request, 'hexgame/position.html', {})


def gamelist(request):
  games = Game.objects.values_list('name');
  context = {'games': games}

  # have to change something about the session so it is saved
  request.session['has_session'] = True

  return render(request, 'hexgame/gamelist.html', context)

def createGame(request):
  print("IN Hexgame creategame")
  gamename = request.POST['gamename']
  try:
    game = Game.objects.get(name=gamename)
    return HttpResponse('A game with that name already exists!')
  except ObjectDoesNotExist:
    Game(name=gamename).save();
    return redirect('hexgame:gamelist')

def joinGame(request, gamename):
  print(request.POST)
  username = request.POST['username']
  game = Game.objects.get(name=gamename)
  num_players = len(Player.objects.filter(game=game))
  key = request.session.session_key
  try:
    print(key)
    print(game)
    player = Player.objects.get(key=key,game=game)
  except ObjectDoesNotExist:
    player = Player(username=username,key=key,game=game,num=num_players)
    player.save()
    game.save()
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        str(game.id),
        {'type': 'playerJoined',
         'username': username,
         'num': num_players}
    )    

  return redirect('hexgame:board', gamename)



