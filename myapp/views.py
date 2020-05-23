from django.shortcuts import render
from django.core.exceptions import ObjectDoesNotExist

from django.http import HttpResponse
from myapp.models import *

# Create your views here.

def index(request):
  return HttpResponse("Hello, world. You're at the index.")

def board(request, player, gameid):

  try:
    game = Game.objects.get(pk=gameid)
  except ObjectDoesNotExist:
    game = Game.objects.createGame(gameid);


  context = game.getGamestateContext(player);


  return render(request, 'myapp/board.html', context)

def position(request):


  return render(request, 'myapp/position.html', {})
