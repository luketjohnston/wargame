from django.shortcuts import render, redirect
from django.core.exceptions import ObjectDoesNotExist

from django.http import HttpResponse
from myapp.models import *

# Create your views here.

def index(request):
  return HttpResponse("Hello, world. You're at the index.")

def board(request, gamename):

  unique_key = request.session.session_key

  try:
    game = Game.objects.get(name=gamename)
  except ObjectDoesNotExist:
    game = Game.objects.createGame(gamename);

  player = game.getPlayerByKey(unique_key)

  context = game.getGamestateContext(player);


  return render(request, 'myapp/board.html', context)

def position(request):
  return render(request, 'myapp/position.html', {})


def gamelist(request):
  games = Game.objects.values_list('name', 'player1', 'player2', 'player3', 'player4');
  context = {'games': games}

  # have to change something about the session so it is saved
  request.session['has_session'] = True

  return render(request, 'myapp/gamelist.html', context)

def createGame(request):
  print("IN myapp createGame")
  gamename = request.POST['gamename']
  try:
    game = Game.objects.get(name=gamename)
    return HttpResponse('A game with that name already exists!')
  except ObjectDoesNotExist:
    game = Game.objects.createGame(gamename);
    return redirect('myapp:gamelist')

def joinGame(request, gamename, player):
  username = request.POST['username']
  game = Game.objects.get(name=gamename)


  if game.getPlayerByKey(request.session.session_key) != 5:
    return HttpResponse('You have already joined this game!')
  if player == 0 and not game.player1:
    game.player1 = username
    game.player1key = request.session.session_key
  if player == 1 and not game.player2:
    game.player2 = username
    game.player2key = request.session.session_key
  if player == 2 and not game.player3:
    game.player3 = username
    game.player3key = request.session.session_key
  if player == 3 and not game.player4:
    game.player4 = username
    game.player4key = request.session.session_key
  game.save()
    
  return redirect('myapp:gamelist')
