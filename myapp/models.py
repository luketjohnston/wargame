from django.db import models
from collections import defaultdict

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

  def associatedTerritories(self):
    return Territory.objects.filter(game=self)

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
      pass
    elif (self.phase % NUM_PHASES == 1):
      pass
    elif (self.phase % NUM_PHASES == 2):
      pass

    self.phase = self.phase + 1
    self.player_ready = '0000';
    self.save()

  def getGamestateContext(self, player):

    territories = Territory.objects.filter(game=self).order_by('num')
    territory_owners = territories.values_list('owner', flat=True)
    territory_troops = territories.values_list('troops', flat=True)
    owned_territories = territories.filter(owner=player)
    opponent =  Game.get_pairings()[self.getTurn()][player]
    opponent_territories = territories.filter(owner=opponent)

    
    attacks = Attack.objects.filter(game=self)
    visible_attacks = []
    if self.phase == 1:
      visible_attacks = attacks.filter(origin__in=owned_territories, target__in=opponent_territories)
      visible_attacks = visible_attacks.values_list('origin__num', 'target__num')
      visible_attacks = [[i,j] for (i,j) in visible_attacks]
    if self.phase == 2:
      visible_attacks = attacks.values_list('origin__num', 'target__num')
      visible_attacks = [[i,j] for (i,j) in visible_attacks]

    context = {
      'player' : player,
      'territory_owners' : list(territory_owners),
      'visible_attacks' : list(visible_attacks),
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

  troops = models.IntegerField(default=0)
  #target = models.ForeignKey('self', on_delete=models.CASCADE)
  #attacking = models.IntegerField(default=0)
  #defending = models.IntegerField(default=0)

class Attack(models.Model):
  game = models.ForeignKey(Game, on_delete=models.CASCADE)
  origin = models.ForeignKey(Territory, on_delete=models.CASCADE, related_name='origin')
  target = models.ForeignKey(Territory, on_delete=models.CASCADE)
  strength = models.IntegerField(default=0)
  


