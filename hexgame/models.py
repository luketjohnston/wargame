from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F
import json
import random

NUM_PHASES = 3
NUM_TURNS = 3
BOARD_EDGE_WIDTH = 6

# bw = board edge width
def getTerritoryIndices(bw):
  indices = []
  for i in range(bw*2-1):
    for j in range(max(i-bw+1, 0), min(bw+i, 2*bw-1)):
      indices.append((i,j))
  return indices
  

  

class Game(models.Model):
  # TODO how many phases?
  phase = models.IntegerField(default=-1)
  player_ready = models.CharField(max_length=50, default='')
  name = models.CharField(max_length=50)

  @classmethod
  def create(cls, gamename):
    if Game.objects.get(name=gamename):
      raise Exception("game %s already exists" % gamename)
    game = cls(gamename, len(players))
    game.save()
    return game

  def createBalancedStart(self):
    territories = getTerritoryIndices(BOARD_EDGE_WIDTH)
    starting_num = len(territories) // self.numPlayers()
    players = list(range(self.numPlayers())) * starting_num
    random.shuffle(territories);
    return zip(territories, players)

  def startGame(self):
    #assert(len(self.player_ready) >= 2, 'tried to start game with less than 2 players')
    owners = self.createBalancedStart()
    for (i,j),owner in owners:
      Territory(i=i,j=j,owner=owner,game=self).save()
    self.player_ready = '0' * self.numPlayers()
    self.save()

  def getTurn(self):
    return (self.phase // NUM_PHASES) % NUM_TURNS


  # updates gamestate to indicate player is ready for next phase
  def playerReady(self, player):
    self.player_ready = self.player_ready[:player] + '1' + self.player_ready[player+1:]
    self.save()

  def processReadyMessage(self, player, message):
    print('in process ready message')
    #if self.getPhase() == -1:
    self.playerReady(player)

  # updates gamestate to indicate player is not ready for next phase
  def playerNotReady(self, player):
    self.player_ready = self.player_ready[:player] + '0' + self.player_ready[player+1:]
    self.save()

  def allReady(self):
    return self.player_ready == '1' * self.numPlayers()
 
  def numPlayers(self):
    return len(self.player_ready)

  def allReadyUpdate(self):
    assert self.allReady()
    if (self.getPhase() == -1):
      self.startGame()

  def ownedTerritories(self, player):
    return self.territories().filter(owner=player)

  def unownedTerritories(self, player):
    return self.territories().filter(~Q(owner=player))

  def territories(self):
    return Territory.objects.filter(game=self)

  def playerIsReady(self, player):
    return self.player_ready[player] == '1'

  def getPhase(self):
    if self.phase == -1: return -1
    return self.phase % NUM_PHASES

  def getGamestate(self, playerNum):
    territories = Territory.objects.filter(game=self)
    territory_owners = territories.values_list('i', 'j', 'owner')
    usernames = Player.objects.filter(game=self).values_list('username',flat=True)
    
    context = {
      'player' : playerNum,
      'usernames' : list(usernames),
      'territory_owners' : list(territory_owners),
      'phase': self.getPhase(),
      'turn': self.getTurn(),
      'player_ready': [int(pr=='1') for pr in self.player_ready],
      'gamename': self.name,
    }
    return context

  def getGamestateContext(self, playerNum):
    gamestate = self.getGamestate(playerNum)
    gamestate['usernames'] = json.dumps(gamestate['usernames'])
    gamestate['territory_owners'] = json.dumps(gamestate['territory_owners'])
    gamestate['gamename'] = json.dumps(gamestate['gamename'])
    return gamestate

class Player(models.Model):
  username = models.CharField(max_length=50)
  key = models.CharField(max_length=50)
  num = models.IntegerField(default=0)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)


class Territory(models.Model):
  i = models.IntegerField(default=0)
  j = models.IntegerField(default=0)
  owner = models.IntegerField(default=0)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
