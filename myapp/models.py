from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F

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
  [25,24,27,29,30],            # 28
  [30,28,27],                  # 29
  [28,29],                     # 30
  [32,22,23,37,36],            # 31
  [33,31,36],                  # 32
  [32,4,34],                   # 33
  [33,3,35],                   # 34
  [34,2],                      # 35
  [32,31,37,38,39,4],          # 36
  [36,23,24,25,38],            # 37
  [36,39,40,25,37],            # 38
  [4,7,6,10,40,38,36],         # 39
  [10,39,18,19,38]             # 40
]

class GameManager(models.Manager):
  def createGame(self, newid):
    print('here1');
    game = self.create(gameid=newid)
    print('here2');
    for i in range(1,41):
      Territory(num=i, owner=(i-1)/10, game=game).save()
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
  gameid = models.IntegerField(primary_key=True);


  @classmethod
  def create(cls, gameid):
    game = cls(gameid=gameid)
    game.save()
    return game

  @classmethod
  def get_pairings(cls):
    turn0 = {0: 1, 1: 0, 2: 3, 3: 2}
    turn1 = {0: 2, 2: 0, 1: 3, 3: 1}
    turn2 = {0: 3, 3: 0, 1: 2, 2: 1}
    return [turn0, turn1, turn2]

  def getTurn(self):
    return (self.phase // NUM_PHASES) % NUM_TURNS

  def getRound(self):
    return self.phase // (NUM_PHASES * NUM_TURNS)
  

  def allReadyUpdate(self):
    assert self.player_ready == '1111'
    if (self.phase % NUM_PHASES == 0):
      self.pushPrivateToPublic()
    elif (self.phase % NUM_PHASES == 1):
      self.pushPrivateToPublic()
    elif (self.phase % NUM_PHASES == 2):
      self.pushPrivateToPublic()
    elif (self.phase % NUM_PHASES == 3):
      self.pushPrivateToPublic()

    self.phase = self.phase + 1
    self.player_ready = '0000';
    self.save()

  # updates gamestate to indicate player is ready for next phase
  def playerReady(self, player):
    self.player_ready = self.player_ready[:player] + '1' + self.player_ready[player+1:]
    self.save()

  def allReady(self):
    return self.player_ready == '1111'

  def ownedTerritories(self, player):
    return self.territories().filter(owner=player)

  def unownedTerritories(self, player):
    return self.territories().filter(~Q(owner=player))

  def availableTroops(self, player):
    return len(self.ownedTerritories(player))

  def territories(self):
    return Territory.objects.filter(game=self)

  def attacks(self):
    return Attack.objects.filter(game=self)
    

  def phase0Ready(self, player, troop_assignments):
    total_troop_assigned = 0;
    owned_territories = self.ownedTerritories(player).values_list('num', flat=True)

    # check if valid troop assignment
    for (i, n) in troop_assignments:
      total_troop_assigned += n;
      if not i in owned_territories:
        print('Got invalid troop assignment (%d,%d) for player %d:' % (i,n,player))
        return
    if n > len(owned_territories):
      print('player %d tried to assign too many troops!' % (player,))
 
    for (i, n) in troop_assignments:
      t = self.territories().get(num=i)
      t.private_troops = n
      t.save()
    self.playerReady(player)
    self.save()

  def phase1Ready(self, player, attack_strengths):
    for (t1, t2, s) in attack_strengths:
      attacking_territory = self.territories().get(num=t1)
      attack = self.attacks().get(origin__num=t1, target__num=t2)
      if attacking_territory.private_troops >= s:
        attack.private_strength = s
        attacking_territory.private_troops -=s
        attack.save()
        attacking_territory.save()
      else:
        print('invalid phase1ready data from player %d' % player)
        print(attack_strengths)
        self.resetPublicToPrivate(player)


    # TODO this is what I need to work on
    self.playerReady(player)
    self.save()

  # resets a player's private data to the public data. Used when a player needs to undo their move
  # or if the server is processing a move and then determines it is invalid and has to discard 
  # the changes
  def resetPublicToPrivate(self, player):
    for t in self.ownedTerritories(player):
      t.private_troops = t.public_troops;
      t.save()

    opponent =  Game.get_pairings()[self.getTurn()][player]
    opponent_territories = territories.filter(owner=opponent)
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
    if self.phase==0:
      self.phase0Ready(player,message['troop_assignments'])
    if self.phase==1:
      self.phase1Ready(player,message['attack_strengths'])
    if self.phase==2:
      self.phase2Ready(player,message['attack_strengths'])
    
    
        
    
    

  def getGamestateContext(self, player):

    territories = Territory.objects.filter(game=self).order_by('num')
    territory_owners = territories.values_list('owner', flat=True)
    opponent =  Game.get_pairings()[self.getTurn()][player]
    opponent_territories = territories.filter(owner=opponent)
    my_territories = self.ownedTerritories(player)

    
    attacks = Attack.objects.filter(game=self)
    visible_attacks = []

    my_troops = my_territories.values_list('num', 'private_troops')
    other_troops = self.unownedTerritories(player).values_list('num', 'public_troops')
    territory_troops = list(my_troops) + list(other_troops) 
    territory_troops = [[n,t] for (n,t) in territory_troops]



    if self.phase == 0: 
      pass
    if self.phase == 1 or self.phase == 2:
      # add my attacks to visible_attacks
      my_attacks = attacks.filter(origin__in=my_territories, target__in=opponent_territories)
      my_attacks = my_attacks.values_list('origin__num', 'target__num')
      my_attack_strengths = list(my_attacks.values_list('private_strength', flat=True))
      a1 = [[i,j,s] for ((i,j), s) in zip(my_attacks, my_attack_strengths)]
      visible_attacks += a1

    if self.phase == 2 or self.phase == 3:
      # add all attacks to visible_attacks
      other_attacks = attacks.filter(~Q(origin__in=my_territories, target__in=opponent_territories))
      if self.phase == 2:
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
      'phase': self.phase,
      'turn': self.getTurn(),
      'round': self.getRound(),
      'player_ready': self.player_ready,
      'gameid': self.gameid,
      'pairings': Game.get_pairings(),
      'opponent': Game.get_pairings()[self.getTurn()][player],
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

class Attack(models.Model):
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  origin = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='origin')
  target = models.ForeignKey(Territory, on_delete=models.CASCADE)
  public_strength = models.IntegerField(default=0)
  private_strength = models.IntegerField(default=0)
  


