from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F
import json
import random

INVALID_MESSAGE = 'invalid'

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
    owners = list(self.createBalancedStart())
    for (i,j),owner in owners:
      p = Player.objects.get(num=owner, game=self)
      Territory(i=i,j=j,owner=p,game=self).save()
    
    for (i,j),owner in owners:
      t1 = Territory.objects.get(i=i,j=j,game=self)
      # add borders
      didj = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1]]
      for di,dj in didj:
        t2 = Territory.objects.filter(i=i+di,j=j+dj,game=self)
        if t2:
          t2 = t2[0]
          Border(t1=t1,t2=t2,game=self).save()

    for p in Player.objects.filter(game=self):
      p.available_troops = 5
      p.save()

    self.player_ready = '0' * self.numPlayers()
    self.save()

  def getTurn(self):
    return (self.phase // NUM_PHASES) % NUM_TURNS


  # updates gamestate to indicate player is ready for next phase
  def playerReady(self, player):
    self.player_ready = self.player_ready[:player.num] + '1' + self.player_ready[player.num+1:]
    self.save()

  def processReadyMessage(self, player, message):
    print('in process ready message')
    #if self.getPhase() == -1:
    self.playerReady(player)

  def processAssignment(self, player, message):
    [i1,j1,i2,j2,attack] = message['assignment']
    b = Border.objects.filter(t1__i=i1,t1__j=j1,t2__i=i2,t2__j=j2,game=self,t1__owner=player)
    if b:
      return b[0].incTroopsIfPossible(attack)
    else:
      return {INVALID_MESSAGE: ''}

  # updates gamestate to indicate player is not ready for next phase
  def playerNotReady(self, player):
    self.player_ready = self.player_ready[:player.num] + '0' + self.player_ready[player.num+1:]
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

  def getGamestate(self, player):
    territories = Territory.objects.filter(game=self)
    territory_owners = territories.values_list('i', 'j', 'owner__num')
    usernames = Player.objects.filter(game=self).values_list('username',flat=True)

    assignment = Border.objects.filter(game=self, t1__owner=player).values_list('t1__i','t1__j','t2__i','t2__j','attack','defense')

    def getBorder(a):
      return Border.objects.get(t1__i=a[0],t1__j=a[1],t2__i=a[2],t2__j=a[3],game=self, t1__owner=player)

    assignment = [a + (getBorder(a).attackStrength(), getBorder(a).defenseStrength()) for a in assignment]
    assignment = []
    context = {
      'player' : player.num,
      'assignment' : assignment,
      'usernames' : list(usernames),
      'territory_owners' : list(territory_owners),
      'phase': self.getPhase(),
      'turn': self.getTurn(),
      'player_ready': [int(pr=='1') for pr in self.player_ready],
      'gamename': self.name,
    }
    return context

  def getGamestateContext(self, player):
    gamestate = self.getGamestate(player)
    gamestate['usernames'] = json.dumps(gamestate['usernames'])
    gamestate['territory_owners'] = json.dumps(gamestate['territory_owners'])
    gamestate['gamename'] = json.dumps(gamestate['gamename'])
    gamestate['assignment'] = json.dumps(gamestate['assignment'])
    return gamestate

class Player(models.Model):
  username = models.CharField(max_length=50)
  key = models.CharField(max_length=50)
  num = models.IntegerField(default=0)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  available_troops = models.IntegerField(default=0)

class Territory(models.Model):
  i = models.IntegerField(default=0)
  j = models.IntegerField(default=0)
  owner = models.ForeignKey(Player, on_delete=models.CASCADE)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)

class Border(models.Model):
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  t1 = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='border_t1')
  t2 = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='border_t2')
  attack = models.IntegerField(default=0)
  defense = models.IntegerField(default=0)


  def attackStrength(self):
    return self.attack
  def defenseStrength(self):
    return self.defense

  def incTroopsIfPossible(self, attack):
    if self.t1.owner == self.t2.owner:
      return {INVALID_MESSAGE: 'tried to assign troops to internal border'}
    if ((attack == (self.defense == 0)) or ((not attack) == (self.attack == 0))) and self.t1.owner.available_troops == 0:
      return {INVALID_MESSAGE: 'tried to assign troops when none available'}
    else:
      owner = self.t1.owner
      troops = self.t1.owner.available_troops
      if attack and self.defense == 0 and troops > 0:
        self.attack += 1
        self.t1.owner.available_troops -= 1
      elif attack and self.defense > 0:
        self.defense -= 1
        self.t1.owner.available_troops += 1
      elif not attack and self.attack == 0 and troops > 0:
        self.defense += 1
        self.t1.owner.available_troops -= 1
      elif not attack and self.attack > 0:
        self.attack -= 1
        self.t1.owner.available_troops += 1
    
      self.t1.owner.save()
      self.save()
    return {'assignmentUpdate' : [self.t1.i, self.t1.j, self.t2.i, self.t2.j, self.attack, self.defense, self.attackStrength(), self.defenseStrength()], 'troopUpdate': [[self.t1.owner.num, self.t1.owner.available_troops]]}
    
