from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F
import random

NUM_PHASES = 3
NUM_TURNS = 3

land_attacks = [
  [2,5],                       # 1
  [35, 3, 5, 1],               # 2
  [34, 4, 7, 6, 2],            # 3
  [33, 3, 36, 39, 7],          # 4
  [1, 2, 6, 8],                # 5
  [5, 3, 7, 8, 9, 10, 39],     # 6
  [6, 3, 4, 39],               # 7
  [9, 6, 5],                   # 8
  [8, 6, 11, 12],              # 9
  [11, 6, 39, 40, 18, 16],     # 10
  [9, 12, 10, 15, 16],         # 11
  [9, 11, 15, 13],             # 12
  [12, 15, 14],                # 13
  [15, 13, 17],                # 14
  [11, 12, 13, 14, 16, 17],    # 15
  [11, 10, 18, 15, 17],        # 16
  [14, 15, 16, 18],            # 17
  [10,16,17,19,20,40],         # 18
  [18,20,25,40],               # 19
  [18,19,28,],                 # 20
  [22],                        # 21
  [21,31,23],                  # 22
  [22,31,37,24,26],            # 23
  [25,37,23,26,27,28],         # 24
  [38,37,24,28,19],            # 25
  [23,24,27],                  # 26
  [28,24,26,29],               # 27
  [25,24,27,29,30,20],         # 28
  [30,28,27],                  # 29
  [28,29],                     # 30
  [32,22,23,36],            # 31
  [33,31,36],                  # 32
  [32,4,34],                   # 33
  [33,3,35],                   # 34
  [34,2],                      # 35
  [32,31,37,38,39,4],          # 36
  [36,23,24,25,38],         # 37
  [36,39,40,25,37],            # 38
  [4,7,6,10,40,38,36],         # 39
  [10,39,18,19,38]             # 40
]

RIVERS = [(31,22), (31,23), (25,19), (28,20), (10,18), (10,16), (11,16), (11,15), (12,15), (15,13), (15,14), (14,17), (2,38), (3,34), (4,33), (4,36)]

# territories that have horses
HORSES = [1,15,22,28]

# territories that have farms
FARMS = [6,14,26,31]

# territories that have mines
MINES = [18,33,37,39]

# territories that are mountains
MOUNTAINS = [36,37,38,39,40]

def createBalancedStart():
  players = [0,1,2,3]
  random.shuffle(players);
  horse_assignments = list(zip(HORSES, players))
  random.shuffle(players);
  mine_assignments = list(zip(MINES, players))
  random.shuffle(players);
  farm_assignments = list(zip(FARMS, players))
  other = list(range(1,41));
  for i in (HORSES + FARMS + MINES):
    other.remove(i)
  players = players * 7
  random.shuffle(players)
  other_assignments = list(zip(other, players))

  all_assignments = horse_assignments + mine_assignments + farm_assignments + other_assignments
  all_assignments.sort(key = lambda mytuple: mytuple[0])
  return [j for (i,j) in all_assignments]
  

class GameManager(models.Manager):
  def createGame(self, gamename):
    game = self.create(name=gamename)

    owners = createBalancedStart()
    for i in range(0,40):
      Territory(num=i+1, owner=owners[i], game=game).save()
    for i in range(len(land_attacks)):
      for j in land_attacks[i]:
        attack = Attack(
          game=game, 
          origin=self.getTerritory(game,i+1),
          target=self.getTerritory(game,j),
        )
        attack.save()
        self.getTerritory(game,i+1).attacks.add(attack)
        self.getTerritory(game,i+1).save()
    game.save()
    return game
    

  def getTerritory(self, game, i):
    return Territory.objects.get(game=game,num=i)


class Game(models.Model):
  # TODO how many phases?
  phase = models.IntegerField(default=0)
  player_ready = models.CharField(max_length=4, default='0000')
  objects = GameManager();
  player1 = models.CharField(max_length=30, null=True)
  player2 = models.CharField(max_length=30, null=True)
  player3 = models.CharField(max_length=30, null=True)
  player4 = models.CharField(max_length=30, null=True)

  player1key = models.CharField(max_length=50, null=True)
  player2key = models.CharField(max_length=50, null=True)
  player3key = models.CharField(max_length=50, null=True)
  player4key = models.CharField(max_length=50, null=True)

  name = models.CharField(max_length=50)


  @classmethod
  def create(cls, gamename):
    if Game.objects.get(name=gamename):
      raise Exception("game %s already exists" % gamename)
    game = cls(gamename)
    game.save()
    return game

  @classmethod
  def get_pairings(cls):
    turn0 = {5: 5, 0: 1, 1: 0, 2: 3, 3: 2}
    turn1 = {5: 5, 0: 2, 2: 0, 1: 3, 3: 1}
    turn2 = {5: 5, 0: 3, 3: 0, 1: 2, 2: 1}
    return [turn0, turn1, turn2]

  def getTurn(self):
    return (self.phase // NUM_PHASES) % NUM_TURNS

  def getRound(self):
    return self.phase // (NUM_PHASES * NUM_TURNS)
  

  def allReadyUpdate(self):
    assert self.player_ready == '1111'
    if (self.getPhase() == 0):
      self.pushPrivateToPublic()
    elif (self.getPhase() == 1):
      self.pushPrivateToPublic()
    elif (self.getPhase() == 2):
      self.pushPrivateToPublic()
      # first, adjust all attacks to net strength. If A attack B at 3 and B attack A at 2, 
      # adjustment will be: A attack B at 1, B attack A at 0
   
      for a in self.attacks():
        matching_attack = a.getComplementaryAttack()
        a.public_strength = max(a.private_strength - matching_attack.private_strength - a.isOverRiver(), 0)
        a.save()

      
      territories = self.territories();
      for t in self.territories():
        defending_strength = t.public_troops * 2 + (t.num in MOUNTAINS); 
        attacks = self.attacks().filter(target=t)
        for a in attacks:
          defending_strength -= a.public_strength
        if defending_strength < 0:
          t.owner = self.get_pairings()[self.getTurn()][t.owner]

        t.public_troops = 0;
        t.private_troops = 0;
        t.save();
      
      for a in self.attacks():
        a.public_strength = 0;
        a.private_strength = 0;
        a.save();

    self.phase = self.phase + 1
    self.player_ready = '0000';
    self.save()


  # given a player key, returns corresponding player 
  # returns 5 if no match
  def getPlayerByKey(self, key):
    print(' in get player by key')
    print(key)
    print(self.player1key)
    print(self.player2key)
    print(self.player3key)
    print(self.player4key)
    if not key:
      return 5
    if self.player1key == key:
      return 0
    if self.player2key == key:
      return 1
    if self.player3key == key:
      return 2
    if self.player4key == key:
      return 3
    return 5

  # updates gamestate to indicate player is ready for next phase
  def playerReady(self, player):
    self.player_ready = self.player_ready[:player] + '1' + self.player_ready[player+1:]
    self.save()

  # updates gamestate to indicate player is not ready for next phase
  def playerNotReady(self, player):
    self.player_ready = self.player_ready[:player] + '0' + self.player_ready[player+1:]
    self.save()

  def allReady(self):
    return self.player_ready == '1111'

  def ownedTerritories(self, player):
    return self.territories().filter(owner=player)

  def unownedTerritories(self, player):
    return self.territories().filter(~Q(owner=player))

  def getAvailableTroops(self, player):
    if self.getPhase() != 0:
      return 0;
    territories = self.ownedTerritories(player).values_list('num', flat=True);
    count = len(territories)
    for t in territories:
      if t in FARMS:
        count += 1
    # can always field at least 10 troops
    return max(count, 10)


  def getAvailableHorses(self, player):
    territories = self.ownedTerritories(player).values_list('num', flat=True);
    count = 0
    for t in territories:
      if t in HORSES:
        count += 1
    return count

  def getAvailableMines(self, player):
    territories = self.ownedTerritories(player).values_list('num', flat=True);
    count = 0
    for t in territories:
      if t in MINES:
        count += 1
    return count
    
        
    

  def territories(self):
    return Territory.objects.filter(game=self)

  def attacks(self):
    return Attack.objects.filter(game=self)
    
  def playerIsReady(self, player):
    return self.player_ready[player] == '1'


  def phase0Ready(self, player, defense_assignments, attack_assignments):
    if self.playerIsReady(player):
      return;
    total_troop_assigned = 0;
    owned_territories = self.ownedTerritories(player).values_list('num', flat=True)
    opponent_territories = self.territories().filter(owner=self.getOpponent(player)).values_list('num', flat=True)

    # check if valid troop assignment
    for (i, n) in defense_assignments:
      total_troop_assigned += n;
      if not i in owned_territories:
        print('Got invalid troop assignment (%d,%d) for player %d:' % (i,n,player))
        return
    for (t1,t2, i) in attack_assignments:
      total_troop_assigned += n;
      if not (t1 in owned_territories and t2 in opponent_territories):
        print('Got invalid attack assignment (%d,%d,%d) for player %d:' % (i,t1,t2,player))
        return

    if n > self.getAvailableTroops(player):
      print('player %d tried to assign too many troops!' % (player,))
      return
 
    for (i, n) in defense_assignments:
      t = self.territories().get(num=i)
      t.private_troops = n
      t.save()

    for (t1, t2, i) in attack_assignments:
      a = self.attacks().get(origin__num=t1, target__num=t2);
      a.private_strength = i
      a.save()

    self.playerReady(player)
    self.save()

  def phase1Ready(self, player, mine_assignments, horse_assignments):
    if self.playerIsReady(player):
      return;

    total_mines = 0
    total_horses = 0
    for (t1, m) in mine_assignments:
      territory = self.territories().get(num=t1)
      territory.private_troops += m
      territory.save()
      total_mines += m
    for (t1, t2, h) in horse_assignments:
      attack = self.attacks().get(origin__num=t1, target__num=t2)
      attack.private_strength += h
      attack.save()
      total_horses += h
    if total_horses > self.getAvailableHorses(player) or total_mines > self.getAvailableMines(player):
      print('invalid phase1ready data from player %d' % player) 
      self.resetPrivateToPublic(player)
    self.playerReady(player)
    self.save()


  def phase2Ready(self, player):
    if self.playerIsReady(player):
      return;
    self.playerReady(player)
    self.save()

  # resets a player's private data to the public data. Used when a player needs to undo their move
  # or if the server is processing a move and then determines it is invalid and has to discard 
  # the changes
  def resetPrivateToPublic(self, player):
    for t in self.ownedTerritories(player):
      t.private_troops = t.public_troops;
      t.save()

    opponent =  Game.get_pairings()[self.getTurn()][player]
    opponent_territories = self.territories().filter(owner=opponent)
    my_territories = self.ownedTerritories(player)
    my_attacks = self.attacks().filter(origin__in=my_territories, target__in=opponent_territories)
    for a in my_attacks:
      a.private_strength = a.public_strength
      a.save()

  # updates private troop assignments to public. Used when all players are ready to proceed to the next phase.
  def pushPrivateToPublic(self):
    for t in self.territories():
      t.public_troops = t.private_troops;
      t.save()
    for a in self.attacks():
      a.public_strength = a.private_strength;
      a.save()

    
      
  def processReadyMessage(self, player, message):
    print('in process ready message')
    if self.getPhase() == 0:
      self.phase0Ready(player,message['defense_assignments'], message['attack_assignments'])
    if self.getPhase() == 1:
      self.phase1Ready(player, message['mine_assignments'], message['horse_assignments'])
    if self.getPhase() == 2:
      self.phase2Ready(player)

  def processResetMessage(self, player):
    self.resetPrivateToPublic(player)
    self.playerNotReady(player);
    
    

  def getOpponent(self, player):
    return Game.get_pairings()[self.getTurn()][player]

  def getPhase(self):
    return self.phase % NUM_PHASES

    
    
    

  def getGamestateContext(self, player):

    territories = Territory.objects.filter(game=self).order_by('num')
    territory_owners = territories.values_list('owner', flat=True)
    opponent =  self.getOpponent(player);
    print('getting gamestate context for player %d' % player)
    print('opponent: %d' % opponent)
    opponent_territories = territories.filter(owner=opponent)
    print(opponent_territories)
    my_territories = self.ownedTerritories(player)

    
    attacks = Attack.objects.filter(game=self)
    visible_attacks = []

    my_troops = my_territories.values_list('num', 'private_troops')
    other_troops = self.unownedTerritories(player).values_list('num', 'public_troops')
    territory_troops = list(my_troops) + list(other_troops) 
    territory_troops = [[n,t] for (n,t) in territory_troops]

     # add my attacks to visible_attacks
    my_attacks = attacks.filter(origin__in=my_territories, target__in=opponent_territories)



    # add my attacks to visible_attacks
    my_attacks = attacks.filter(origin__in=my_territories, target__in=opponent_territories)
    if self.getPhase() == 2:
      # don't show strength 0 attacks for current player
      my_attacks = my_attacks.filter(~Q(public_strength=0)) 
    my_attacks = my_attacks.values_list('origin__num', 'target__num')
    my_attack_strengths = list(my_attacks.values_list('private_strength', flat=True))
    a1 = [[i,j,s] for ((i,j), s) in zip(my_attacks, my_attack_strengths)]
    visible_attacks += a1

    if self.getPhase() == 1 or self.getPhase() == 2:
      # add all attacks to visible_attacks
      other_attacks = attacks.filter(~Q(origin__in=my_territories, target__in=opponent_territories))
      # don't show 0 strength attacks that aren't possible attacks for current player.
      # this will include all attacks that are impossible (intra player attacks, etc.)
      other_attacks = other_attacks.filter(~Q(public_strength=0)) 
      other_attacks = other_attacks.values_list('origin__num', 'target__num')
      other_attack_strengths = list(other_attacks.values_list('public_strength', flat=True))
      a2 = [[i,j,s] for ((i,j), s) in zip(other_attacks, other_attack_strengths)]
      visible_attacks += a2

    context = {
      'player' : player,
      'territory_owners' : list(territory_owners),
      'visible_attacks' : list(visible_attacks),
      'territory_troops' : territory_troops,
      'phase': self.getPhase(),
      'turn': self.getTurn(),
      'round': self.getRound(),
      'player_ready': [int(self.player_ready[i] == '1') for i in range(4)],
      'gamename': self.name,
      'pairings': Game.get_pairings(),
      'opponent': Game.get_pairings()[self.getTurn()][player],
      'available_troops' : self.getAvailableTroops(player),
      'available_horses' : self.getAvailableHorses(player),
      'available_mines' : self.getAvailableMines(player),
      'opponent_horses' : self.getAvailableHorses(opponent),
      'opponent_mines' : self.getAvailableMines(opponent),
    }
    return context

    


  
#class Player(models.Model):
#  username = models.CharField(max_length=50)
#  game = models.ForeignKey(Game, on_delete=models.CASCADE)

class Territory(models.Model):
  num = models.IntegerField()
  #owner = models.ForeignKey(Player, on_delete=models.CASCADE)
  owner = models.IntegerField()
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  attacks = models.ManyToManyField('Attack', related_name='attacks')

  # troops in this territory that are visible to all players
  public_troops = models.IntegerField(default=0)
  # troops in this territory visible to territory owner
  private_troops = models.IntegerField(default=0)
  #target = models.ForeignKey('self', on_delete=models.CASCADE)
  #attacking = models.IntegerField(default=0)
  #defending = models.IntegerField(default=0)

  def hasFarm(self):
    return self.num in FARMS
  def hasMine(self):
    return self.num in MINES
  def hasHorse(self):
    return self.num in HORSES
  def hasMountain(self):
    return self.num in MOUNTAINS

class Attack(models.Model):
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  origin = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='origin')
  target = models.ForeignKey(Territory, on_delete=models.CASCADE)
  public_strength = models.IntegerField(default=0)
  private_strength = models.IntegerField(default=0)

  def getComplementaryAttack(self):
    print('origin and target')
    print(self.origin.num)
    print(self.target.num)
    return Attack.objects.get(origin__num=self.target.num, target__num=self.origin.num, game=self.game)

  def isOverRiver(self):
    return (((self.origin.num, self.target.num) in RIVERS) or ((self.target.num, self.origin.num) in RIVERS))
  


