from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F
import json
import random

TERRAIN = ['water', 'forest', 'hills', 'plains', 'mountain']
TERRAIN_TO_NUM = {'water': 0, 'forest': 1, 'hills': 2, 'plains': 3, 'mountain': 4}
INVALID_MESSAGE = 'invalid'
DIDJ = ((0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1))

NUM_PHASES = 2
NUM_TURNS = 10
BOARD_EDGE_WIDTH = 3

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
  name = models.CharField(max_length=50)

  @classmethod
  def create(cls, gamename):
    if Game.objects.get(name=gamename):
      raise Exception("game %s already exists" % gamename)
    if not gamename:
      raise Exception("gamename cannot be empty!")
    game = cls(gamename, len(players))
    game.save()


    return game

  def createBalancedStart(self):
    territories = getTerritoryIndices(BOARD_EDGE_WIDTH)
    starting_num = len(territories) // self.numPlayers()
    players = list(range(self.numPlayers())) * starting_num
    players += [-1] * (len(territories) - len(players))
    random.shuffle(territories);
    return zip(territories, players)

  def startGame(self):
    # assert 2 players?
    owners = list(self.createBalancedStart())
    if Territory.objects.filter(game=self):
      print('Tried to start game that is already started')
      return
    for (i,j),owner in owners:
      if owner == -1:
        t = Territory(i=i,j=j,owner=None,game=self)
        t.terrain = 0
        t.save()
      else:
        p = Player.objects.get(num=owner, game=self)
        t = Territory(i=i,j=j,owner=p,game=self)
        t.terrain = random.randrange(1,len(TERRAIN))
        t.save()
    
    for (i,j),owner in owners:
      t1 = Territory.objects.get(i=i,j=j,game=self)
      # add borders
      for di,dj in DIDJ:
        t2 = Territory.objects.filter(i=i+di,j=j+dj,game=self)
        if t2:
          t2 = t2[0]
          Border(t1=t1,t2=t2,game=self).save()

    all_players =  Player.objects.filter(game=self)
    for p in all_players:
      for opponent in all_players: 
        if not opponent == p:
          tc = TroopCounter(game=self, player=p, opponent=opponent, available=5, max_available=5)
          tc.save()
    # TODO do we need this save?
    self.save()

  def getTurn(self):
    return (self.phase // NUM_PHASES) % NUM_TURNS


  # updates gamestate to indicate player is ready for next phase
  def playerReady(self, player):
    player.ready=True
    player.save()

  def processReadyMessage(self, player, message):
    print('in process ready message')
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
    player.ready = False
    player.save()

  def allReady(self):
    return all(Player.objects.filter(game=self).values_list('ready', flat=True))
 
  def numPlayers(self):
    return len(Player.objects.filter(game=self))

  def resolveAttacks(self):
    attacks = Border.objects.filter(game=self)
    attacks = [(a, a.attackStrength()) for a in attacks if a.attackStrength() > 0]
    updates = []
    for border,attackStrength in attacks:
      defendStrength = Border.objects.get(game=self, t1=border.t2, t2=border.t1).defendStrength()
      if attackStrength > defendStrength:
        updates.append((border.t2, border.t1))
    for (defender, attacker) in updates:
      defender.owner = attacker.owner
      defender.save()
    for tc in TroopCounter.objects.filter(game=self):
      tc.available = tc.max_available
      tc.save()
    Border.objects.filter(game=self).update(attack=0,defend=0)
        

  def allReadyUpdate(self):
    assert self.allReady()
    if (self.getPhase() == -1):
      self.startGame()
      self.save()
    if (self.getPhase() % 2 == 0):
      pass
    if (self.getPhase() % 2 == 1):
      self.resolveAttacks()

    Player.objects.filter(game=self).update(ready=False)
    self.phase += 1
    self.save()
      

  def ownedTerritories(self, player):
    return self.territories().filter(owner=player)

  def unownedTerritories(self, player):
    return self.territories().filter(~Q(owner=player))

  def territories(self):
    return Territory.objects.filter(game=self)

  def playerIsReady(self, player):
    return player.ready

  def getPhase(self):
    if self.phase == -1: return -1
    return self.phase % NUM_PHASES
  
  def readies(self):
    return list(Player.objects.filter(game=self).values_list('ready', flat=True).order_by('num'))

  def getOwners(self):
    return list(self.territories().values_list('i', 'j', 'owner__num'))

  def getUsernames(self):
    return list(Player.objects.filter(game=self).values_list('username',flat=True))

  def getAssignment(self, player):
    assignment = []
    all_borders = Border.objects.filter(game=self).exclude(t1__owner=F('t2__owner'))
    own_borders = all_borders.filter(t1__owner=player)
    opp_borders = all_borders.exclude(t1__owner=player)
    own_r = [b.getAssignment() for b in own_borders]
    if self.getPhase() == -1:
      return []
    elif self.getPhase() == 0:
      opp_r = [b.getPubAssignment() for b in opp_borders]
    elif self.getPhase() == 1:
      opp_r = [b.getAssignment() for b in opp_borders]

    return own_r + opp_r 

  def getOppStrengths(self, player):
    opp_borders = Border.objects.filter(game=self).exclude(t1__owner=player)
    return [b.getAssignment() for b in opp_borders]

  def getAvailableTroops(self, player):
    tc = TroopCounter.objects.filter(game=self, player=player)
    return list(tc.values_list('opponent__num', 'available'))

  def getTerrain(self):
    return list(Territory.objects.filter(game=self).values_list('i', 'j', 'terrain'))
    

  def getGamestate(self, player):
    context = {
      'player' : player.num,
      'assignments' : self.getAssignment(player),
      'usernames' : self.getUsernames(),
      'territory_owners' : self.getOwners(),
      'phase': self.getPhase(),
      'turn': self.getTurn(),
      'readies': self.readies(),
      'gamename': self.name,
      'available_troops': self.getAvailableTroops(player),
    }
    return context

  def getGamestateContext(self, player):
    gamestate = self.getGamestate(player)
    gamestate['usernames'] = json.dumps(gamestate['usernames'])
    gamestate['readies'] = json.dumps(gamestate['readies'])
    gamestate['territory_owners'] = json.dumps(gamestate['territory_owners'])
    gamestate['gamename'] = json.dumps(gamestate['gamename'])
    gamestate['assignments'] = json.dumps(gamestate['assignments'])
    gamestate['available_troops'] = json.dumps(gamestate['available_troops'])
    gamestate['terrain'] = json.dumps(self.getTerrain())
    return gamestate

    
class Player(models.Model):
  username = models.CharField(max_length=50)
  key = models.CharField(max_length=50)
  num = models.IntegerField(default=0)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  ready = models.BooleanField(default=False)

class TroopCounter(models.Model):
  max_available = models.IntegerField(default=0)
  available = models.IntegerField(default=0)
  player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='player')
  opponent = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='opponent')
  game = models.ForeignKey(Game, on_delete=models.CASCADE)

class Territory(models.Model):
  i = models.IntegerField(default=0)
  j = models.IntegerField(default=0)
  owner = models.ForeignKey(Player, on_delete=models.CASCADE, null=True)
  terrain = models.IntegerField(default=0)
  game = models.ForeignKey(Game, on_delete=models.CASCADE)

  def isAdjacent(self, t):
    my_didj = (self.i - t.i, self.j - t.j)
    return my_didj in DIDJ

  # returns territories adjacent to this one that are owned by the same player
  def getOwnedSurrounding(self):
    return Territory.objects.none().union(*[Territory.objects.filter(game=self.game, owner=self.owner, i=self.i+di, j=self.j+dj) for (di,dj) in DIDJ])
    

class Border(models.Model):
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  t1 = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='border_t1')
  t2 = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='border_t2')
  attack = models.IntegerField(default=0)
  defend = models.IntegerField(default=0)

  def getAssignment(self):
    return [self.t1.i, self.t1.j, self.t2.i, self.t2.j, self.attack, self.defend, self.attackStrength(), self.defendStrength()]
  def getPubAssignment(self):
    return [self.t1.i, self.t1.j, self.t2.i, self.t2.j, 0, 0, self.baseAttackStrength(), self.baseDefendStrength()]

  def getLeftBorder(self):
    DIDJ_to_leftTile = {
      (0,1): (-1,0), 
      (1,1): (0,1), 
      (1,0): (1,1),
      (0,-1): (1,0),
      (-1,-1): (0,-1),
      (-1,0): (-1,-1)}

    di,dj = self.t2.i - self.t1.i, self.t2.j - self.t1.j
    ltdi,ltdj = DIDJ_to_leftTile[(di,dj)]
    lti,ltj = self.t1.i + ltdi, self.t1.j + ltdj
    leftTile = Territory.objects.filter(game=self.game,i=lti,j=ltj)
    if not leftTile: 
      return None
    elif leftTile[0].owner == self.t1.owner:
      return Border.objects.get(game=self.game, t1=leftTile[0], t2=self.t2)
    else:
      return Border.objects.get(game=self.game,t1=self.t1, t2=leftTile[0])

  def getRightBorder(self):
    DIDJ_to_rightTile = {
      (-1,0): (0,1),
      (0,1) : (1,1),
      (1,1) : (1,0),
      (1,0) : (0,-1),
      (0,-1): (-1,-1),
      (-1,-1): (-1,0)}
    di,dj = self.t2.i - self.t1.i, self.t2.j - self.t1.j
    rtdi,rtdj = DIDJ_to_rightTile[(di,dj)]
    rti,rtj = self.t1.i + rtdi, self.t1.j + rtdj
    rightTile = Territory.objects.filter(game=self.game,i=rti,j=rtj)
    if not rightTile: 
      return None
    elif rightTile[0].owner == self.t1.owner:
      return Border.objects.get(game=self.game, t1=rightTile[0], t2=self.t2)
    else:
      return Border.objects.get(game=self.game,t1=self.t1, t2=rightTile[0])

  def baseAttackStrength(self):
    return 0
  def baseDefendStrength(self):
    lb = self.getLeftBorder()
    rb = self.getRightBorder()
    adjustment = 0
    if self.t1.terrain == TERRAIN_TO_NUM['mountain'] or self.t1.terrain == TERRAIN_TO_NUM['forest']:
      adjustment += 1
    for t in self.t1.getOwnedSurrounding():
      if t.terrain == TERRAIN_TO_NUM['forest']:
        adjustment += 1; 
        break
    #if lb and (not lb.t1 == self.t1) and lb.t1.terrain == TERRAIN_TO_NUM['mountain']:
    #  adjustment += 1
    #if rb and (not rb.t1 == self.t1) and rb.t1.terrain == TERRAIN_TO_NUM['mountain']:
    #  adjustment += 1
    return adjustment
  def attackStrength(self):
    if self.t2.terrain == TERRAIN_TO_NUM['water']: 
      return 0
    print("IN ATTACK STRENGTH")
    adjustment = 0
    if self.t1.terrain == TERRAIN_TO_NUM['hills']:
      adjustment += self.defend

    lb = self.getLeftBorder()
    rb = self.getRightBorder()
    if lb:
      print('terrain: ' + str(TERRAIN[lb.t1.terrain]))
      print('lb.t2.owner: ' + str(lb.t2.owner))
      print('self.t2.owner: ' + str(self.t2.owner))
    if lb and lb.t1.terrain == TERRAIN_TO_NUM['plains'] and lb.t2.owner == self.t2.owner:
      print('in first if')
      adjustment += lb.attack
    if rb and rb.t1.terrain == TERRAIN_TO_NUM['plains'] and rb.t2.owner == self.t2.owner:
      print('in second if')
      adjustment += rb.attack
    return self.attack + adjustment + self.baseAttackStrength()
  def defendStrength(self):
    adjustment = 0
    if self.t1.terrain == TERRAIN_TO_NUM['hills']:
      adjustment += self.attack
    [rb,lb] = [self.getRightBorder(), self.getLeftBorder()]
    for b in [rb,lb]:
      if b and b.t2.owner == self.t2.owner:
        adjustment += b.defend
    

    return self.defend + adjustment + self.baseDefendStrength()

  def incTroopsIfPossible(self, attack):
    if self.t1.owner == self.t2.owner:
      return {INVALID_MESSAGE: 'tried to assign troops to internal border'}
    if self.t2.owner == None:
      return {INVALID_MESSAGE: 'tried to attack a body of water'}
    tc = TroopCounter.objects.get(game=self.game,player=self.t1.owner,opponent=self.t2.owner)
    if ((attack == (self.defend == 0)) or ((not attack) == (self.attack == 0))) and tc.available == 0:
      return {INVALID_MESSAGE: 'tried to assign troops when none available'}
    else:
      owner = self.t1.owner
      available = tc.available
      if attack and self.defend == 0 and available > 0:
        self.attack += 1
        tc.available -= 1
      elif attack and self.defend > 0:
        self.defend -= 1
        tc.available += 1
      elif not attack and self.attack == 0 and available > 0:
        self.defend += 1
        tc.available -= 1
      elif not attack and self.attack > 0:
        self.attack -= 1
        tc.available += 1
      tc.save()
      self.save()
 
    return {'assignments' : [b.getAssignment() for b in [self, self.getLeftBorder(), self.getRightBorder()] if b], 'troopUpdate': [[self.t2.owner.num, tc.available]]}
    
