from django.shortcuts import render, redirect
from django.core.exceptions import ObjectDoesNotExist
from django.template import Context
from hexgame.game import GameOb
from channels.layers import get_channel_layer
from hexgame.consumers import GameConsumer

from asgiref.sync import async_to_sync


from django.http import HttpResponse
from hexgame.models import *

# Create your views here.

def index(request):
  return HttpResponse("Hello, world. You're at the index.")

def board(request, gamename):
  #key = request.session.session_key
  context = {'gamename' : gamename}
  return render(request, 'hexgame/board.html', context)

def position(request):
  return render(request, 'hexgame/position.html', {})


def gamelist(request):
  games = GameFile.objects.values_list('name');
  context = {'games': games}

  # have to change something about the session so it is saved
  request.session['has_session'] = True

  return render(request, 'hexgame/gamelist.html', context)

def createGame(request):
  print("IN Hexgame creategame")
  gamename = request.POST['gamename']
  try:
    game_file = GameFile.objects.get(name=gamename)
    return HttpResponse('A game with that name already exists!')
  except ObjectDoesNotExist:
    game = GameOb(gamename)
    game_file = GameFile(name=gamename)
    game_file.save()
    game_file.saveGame(game)
    return redirect('hexgame:gamelist')

def joinGame(request, gamename):
  username = request.POST['username']
  key = request.session.session_key
  print('in join game')
  print(username)
  print(key)
  try:
    gf = GameFile.objects.get(name=gamename)
    game = gf.getGame()
    p = game.addPlayer(key, username)
    gf.saveGame(game)

    async_to_sync(get_channel_layer().group_send)(
      GameConsumer.staticGameGroup(gf.id),
      {'type': 'playerAdded'}
    )
     
    
  except ObjectDoesNotExist:
    return HttpResponse('Tried to join a game that does not exist! Spooky..')
  except InvalidRequest:
    return HttpResponse('That game has already started, rip')
  return redirect('hexgame:board', game.name)



