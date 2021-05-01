from collections import defaultdict, Counter
import random
from datetime import datetime, timedelta, timezone
from .tasks import nextPhase as nextPhaseTask
from .consumers import InvalidRequest, GameTerminated


MIN_START_TILES_PER_PLAYER = 5
TERRAIN = ['water', 'forest', 'hills', 'plains', 'mountain']
TERRAIN_TO_NUM = {'water': 0, 'forest': 1, 'hills': 2, 'plains': 3, 'mountain': 4}
DIDJ = ((0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1))

NUM_PHASES = 2
NUM_TURNS = 10


def boardEdgeWidth(np):
  bew = 1
  def total_tiles(bew):
    return 3 * (bew - 1) * bew + 1
  while total_tiles(bew) < MIN_START_TILES_PER_PLAYER * np:
    bew += 1
  return bew

# bw = board edge width
def getTerritoryIndices(bw):
  indices = []
  for i in range(bw*2-1):
    for j in range(max(i-bw+1, 0), min(bw+i, 2*bw-1)):
      indices.append((i,j))
  return indices

class GameOb:
  def __init__(self, name):
    self.usernames = []
    self.keys = {}
    self.readies = []
    self.borders = []
    self.territories = []
    self.terrain = []
    self.available = [] # available troops for each player
    self.owners = []
    self.name = name
    self.phase = -1
    self.bew = 0
    self.ainum = 0
    self.is_ai = []
    # if a game isn't started in 1 minutes after it's created, it will be
    # started automatically
    self.nextPhaseTime = datetime.now(timezone.utc) + timedelta(minutes=10)
    self.turnTime = timedelta(minutes=0.2)

    # delay celery task by nextPhaseTime to advance phase
    nextPhaseTask.apply_async((self.name,self.phase), eta=self.nextPhaseTime)
    


  def getAllTerritories(self):
    return getTerritoryIndices(self.bew)

  def setAvailable(p1, p2, a):
    self.available[p1][p2] = a

  def getPlayer(self, key):
    if not key in self.keys:
      raise InvalidRequest("You have not joined this game")
    return self.keys[key]

  def addPlayer(self, key, username):
    if self.territories:
      raise InvalidRequest('Game is already started, can\'t add any more players.')
    self.usernames.append(username)
    self.is_ai.append(False)
    self.readies.append(False)
    self.keys[key] = len(self.usernames) - 1
    return len(self.usernames) - 1

  def addAI(self):
    if self.territories:
      raise InvalidRequest('Game is already started, can\'t add any more players.')
    self.usernames.append('Bot_' + str(self.ainum))
    self.ainum += 1
    self.readies.append(True)
    self.is_ai.append(True)

  def maxTroops(self,p1,p2):
    troops = 0
    for b in self.allBorders():
      (t1,t2) = ((b[0],b[1]),(b[2],b[3]))
      if self.getOwner(t1) == p1 and self.getOwner(t2) == p2:
        troops += 1
    return troops

  def numPlayers(self):
    return len(self.usernames)
  def setTroops(self, b,troops):
    (i1,j1,i2,j2) = b
    self.borders[i1][j1][i2-i1+1][j2-j1+1] = troops
  def getTroops(self, b):
    (i1,j1,i2,j2) = b
    return self.borders[i1][j1][i2-i1+1][j2-j1+1]
  def getTurn(self):
    return (self.phase // NUM_PHASES) 

  def readyPlayer(self, p):
    self.readies[p] = True
  def unreadyPlayer(self, p):
    self.readies[p] = False
  def isReady(self, p):
    return self.readies[p]

  def startGame(self):
    if len(self.territories) > 0: 
      raise InvalidRequest('tried to start game that is already started')
    if len(self.usernames) < 2:
      raise InvalidRequest('tried to start a game with less than 2 players')

    bew = boardEdgeWidth(self.numPlayers())
    self.bew = bew
    self.territories = [[None for _ in range(2*bew-1)] for _ in range(2*bew-1)]
    self.owners = [[None for _ in range(2*bew-1)] for _ in range(2*bew-1)]
    self.terrain = [[None for _ in range(2*bew-1)] for _ in range(2*bew-1)]
    self.borders = [[[[None for _ in range(3)] for _ in range(3)] for _ in range(2*bew-1)] for _ in range(2*bew-1)]
    
    # t_is = territory indices, p_is = player indices
    t_is = getTerritoryIndices(bew)
    starting_num = len(t_is) // self.numPlayers()
    p_is = list(range(self.numPlayers())) * starting_num
    p_is += [-1] * (len(t_is) - len(p_is))
    random.shuffle(t_is);

    for (i,j),owner in zip(t_is, p_is):
      if owner == -1:
        self.owners[i][j] = None
        self.terrain[i][j] = TERRAIN_TO_NUM['water']
      else:
        self.owners[i][j] = owner
        self.terrain[i][j] = random.randrange(1, len(TERRAIN))
    
    for (i,j),owner in zip(t_is, p_is):
      for di,dj in DIDJ:
        
        self.setTroops((i,j,i+di,j+dj),0)

    self.available = [[self.maxTroops(i,j) for i in range(len(self.usernames))] for j in range(len(self.usernames))]
  
  def getBorder_ij(i1,j1,i2,j2):
    return self.borders[i1][j1][i2-i1+1][j2-j1+1]
  def getBorder_didj(i1,j1,di,dj):
    return self.borders[i1][j1][di+1][dj+1]
  def getBorderValue(self, b):
    (i1,j1,i2,j2) = b
    return self.borders[i1][j1][i2-i1+1][j2-j1+1]
  def setBorderValue(self, b, v):
    (i1,j1,i2,j2) = b
    self.borders[i1][j1][i2-i1+1][j2-j1+1] = v
    

  def processAssignment(self, player, assignment):
    if self.isReady(player):
      raise InvalidRequest('cannot assign troops when in ready state')
    if (not self.getPhase() == 0):
      raise InvalidRequest('tried to assign troops outside of troop assignment phase')
    
    [i1,j1,i2,j2,attack] = assignment
    b = (i1,j1,i2,j2)
    return self.incTroopsIfPossible(b,player,attack)

  def allReady(self):
    return all(self.readies)

  def getPhase(self):
    if self.phase == -1: return -1
    return self.phase % 2

  def assignTroopsAI(self):
    for player,isAI in enumerate(self.is_ai):
      if not isAI: continue
      for opp,_ in enumerate(self.is_ai):
        if opp == player: continue
        borders = list(self.getBordersBetween(player, opp))
        for t in range(self.available[player][opp]):
          # select random border, add a troop to it
          b = random.choice(borders)
          bv = self.getBorderValue(b) 
          # if border already has assigned troops, add a troop of the same type
          # (if attacking, add attacker. if defending, add defender)
          if not bv == 0:
            troop_type = 2 * int(bv > 0) - 1
          else:
            troop_type = random.choice([-1,1])
          self.setBorderValue(b, bv + troop_type)

  def getBordersBetween(self, player, opp):
    for b in self.allBorders():
      (t1,t2) = b[0:2],b[2:]
      if self.getOwner(t1) == player and self.getOwner(t2) == opp:
        yield b
        

  def allReadyUpdate(self):
    if (self.getPhase() == -1):
      self.startGame()
    elif (self.getPhase() % 2 == 0):
      self.assignTroopsAI()
    elif (self.getPhase() % 2 == 1):
      self.resolveAttacks()
    self.phase += 1
    self.readies = self.is_ai.copy()
    self.nextPhaseTime = datetime.now(timezone.utc) + self.turnTime
    nextPhaseTask.apply_async((self.name,self.phase), eta=self.nextPhaseTime)


  def getBaseAttack(self, border):
    (i1,j1,i2,j2) = border
    return 0
  def getBaseDefend(self, border):
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    d = 0
    nearbyForest = False
    if self.getTerrain((i1,j1)) == 'mountain':
      d += 1 
    for (di,dj) in DIDJ + ((0,0),):
      t3 = (i1+di,j1+dj)
      if ((self.getTerrain(t3) == 'forest')
          and self.getOwner(t3) == self.getOwner(t1)):
        nearbyForest = True
    d += int(nearbyForest)  
    return d


  def getOwner(self, t):
    (i,j) = t
    if (i < 0 or j < 0):
      return None
    try:
      return self.owners[i][j]
    except IndexError:
      return None

  def getTerrain(self, t):
    (i,j) = t
    try:
      if self.terrain[i][j] == None:
        return None
      return TERRAIN[self.terrain[i][j]]
    except IndexError:
      return None

  def getTerrainFromBorder(self,b):
    (i1,j1,i2,j2) = b
    try:
      return self.getTerrain((i1,j1))
    except IndexError:
      return None

  def isValidBorder(self, b):
   (i1,j1,i2,j2) = b
   t1, t2 = (i1,j1),(i2,j2)
   return not (
    self.getOwner(t1) == None or self.getOwner(t2) == None or 
    self.getOwner(t1) == self.getOwner(t2))

  def getBorderOwner(self,b):
    (i1,j1,i2,j2) = b
    return self.getOwner((i1,j1))

  def getAttack(self, border):
    if not self.isValidBorder(border):
      return 0
    (i1,j1,i2,j2) = border
    try:
      v =  self.borders[i1][j1][i2-i1+1][j2-j1+1]
      if v and v > 0:
        return v
      return 0
    except IndexError:
      return 0

  def getDefend(self, border):
    if not self.isValidBorder(border):
      return 0
    (i1,j1,i2,j2) = border
    try:
      v = self.borders[i1][j1][i2-i1+1][j2-j1+1]
      if v and v < 0:
        return -1 * v
      return 0
    except IndexError:
      return 0

  def getAttackStrength(self, border):
    if not self.isValidBorder(border):
      return 0
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    a = self.getBaseAttack(border)
    rb = self.getRightBorder(border)
    lb = self.getLeftBorder(border)
    blist = [b for b in [rb,lb] if b]
    for b in blist:
      if self.getTerrainFromBorder(b) == 'plains':
        a += self.getAttack(b)
    a += self.getAttack(border)
    return a

  def getDefendStrength(self, border):
    if not self.isValidBorder(border):
      return 0
    (i1,j1,i2,j2) = border
    d = self.getBaseDefend(border)
    rb = self.getRightBorder(border)
    lb = self.getLeftBorder(border)
    blist = [b for b in [rb,lb] if b]
    for b in blist:
      d += self.getDefend(b)
      if self.getTerrainFromBorder(b) == 'hills':
        d += self.getAttack(b)
    d += self.getDefend(border) * 2
    return d

  def getRightBorder(self, border):
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    DIDJ_to_rightTile = {
      (-1,0): (0,1),
      (0,1) : (1,1),
      (1,1) : (1,0),
      (1,0) : (0,-1),
      (0,-1): (-1,-1),
      (-1,-1): (-1,0)}

    di,dj = i2-i1,j2-j1
    rtdi,rtdj = DIDJ_to_rightTile[(di,dj)]
    rightTile = (i1 + rtdi, j1 + rtdj)
    if (not self.getOwner(rightTile) == None) and self.getOwner(rightTile) == self.getOwner(t1):
      return (rightTile[0], rightTile[1], i2, j2)
    elif not self.getOwner(rightTile) == None and self.getOwner(rightTile) == self.getOwner(t2):
      return (i1, j1, rightTile[0], rightTile[1])
    else:
      return None

  def getLeftBorder(self, border):
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    DIDJ_to_leftTile = {
      (0,1): (-1,0), 
      (1,1): (0,1), 
      (1,0): (1,1),
      (0,-1): (1,0),
      (-1,-1): (0,-1),
      (-1,0): (-1,-1)}

    di,dj = i2-i1,j2-j1
    ltdi,ltdj = DIDJ_to_leftTile[(di,dj)]
    leftTile = (i1 + ltdi, j1 + ltdj)
    if (not self.getOwner(leftTile) == None) and self.getOwner(leftTile) == self.getOwner(t1):
      return (leftTile[0], leftTile[1], i2, j2)
    elif not self.getOwner(leftTile) == None and self.getOwner(leftTile) == self.getOwner(t2):
      return (i1, j1, leftTile[0], leftTile[1])
    else:
      return None
    


  def resolveAttacks(self):

    human_troop_assigned = False
    updates = []
    for (i,j) in getTerritoryIndices(self.bew):
      attacks = [0 for _ in range(self.numPlayers())]
      for di,dj in DIDJ:
        defending_border =  (i,j,i+di,j+dj)
        attacking_border =  (i+di,j+dj,i,j)
        if not self.isValidBorder(attacking_border):
          continue
        if (not self.getBorderValue(attacking_border) == 0) and not self.is_ai[self.getBorderOwner(attacking_border)]:
          human_troop_assigned = True
        
        attack = self.getAttackStrength(attacking_border)
        defend = self.getDefendStrength(defending_border)
        defend += self.getAttackStrength(defending_border)
        if attack and attack > defend:
          attacks[self.getBorderOwner(attacking_border)] += attack
      if max(attacks) > 0:
        # if there is a tie in attacks, no change of ownership
        if Counter(attacks)[max(attacks)] > 1:
          continue
        updates.append((i,j,max(enumerate(attacks), key=lambda x: x[1])[0]))
    for i,j,o in updates:
        self.owners[i][j] = o
    for i in range(len(self.available)):
      for j in range(len(self.available[i])):
        self.available[i][j] = self.maxTroops(i,j)
    # zero all borders
    self.borders = [[[[0 for _ in range(3)] for _ in range(3)] for _ in range(2*self.bew-1)] for _ in range(2*self.bew-1)]
    # if no human assigned any troops and no human was "ready" for the next
    # phase, terminate the game
    if (not human_troop_assigned) and self.is_ai == self.readies:
      # went a turn without any human assigning any troops. Delete game
      raise GameTerminated()
      
    

  def isInternal(self, border):
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    return self.getOwner(t1) == self.getOwner(t2)

  def getAssignment(self, border):
    (i1,j1,i2,j2) = border
    return [i1,j1,i2,j2, self.getAttack(border), self.getDefend(border), self.getAttackStrength(border),self.getDefendStrength(border)]

  def getPubAssignment(self, border):
    (i1,j1,i2,j2) = border
    return [i1,j1,i2,j2, 0, 0, self.getBaseAttack(border),self.getBaseDefend(border)]

  def allBorders(self):
    for i in range(len(self.borders)):
      for j in range(len(self.borders[i])):
        for di,dj in DIDJ:
          b = (i,j,i+di,j+dj)
          if self.isValidBorder(b):
            yield (i,j,i+di,j+dj)
    

  def getAllAssignments(self, player):
    assignment = []
    phase = self.getPhase()
    if phase == -1:
      return []
    else:
      for b in self.allBorders():
        if not self.getBorderOwner(b) == None:
          if phase == 0 and not self.getBorderOwner(b) == player:
            assignment.append(self.getPubAssignment(b))
          else:
            assignment.append(self.getAssignment(b))
    return assignment

  def getAllTerrain(self):
    terrain = []
    for t in self.getAllTerritories():
      (i,j) = t
      ter = self.getTerrain(t)
      if not ter == None:
        terrain.append([i,j,TERRAIN_TO_NUM[ter]])
    return terrain

  def reset(self, player, opp):
    if (not self.getPhase()  == 0):
      raise InvalidRequest('Cannot reset after the assignment phase')
    if (self.isReady(player)):
      raise InvalidRequest('You need to unready before resetting')
      
    self.available[player][opp] = self.maxTroops(player,opp)
    assignments = []
    for b in self.allBorders():
      (t1, t2) = ((b[0],b[1]),(b[2],b[3]))
      if self.getOwner(t2) == opp and self.getOwner(t1) == player:
        self.setTroops(b, 0)
        # "Pub" assignment here is so that we can construct the assignments 
        # in this for loop (otherwise we would have to reset all of them, and
        # then iterate through again, so that getAssignment doesn't take into
        # account strength from adjacent borders that haven't been reset yet)
        assignments.append(self.getPubAssignment(b))

    troopUpdate = [[opp, self.available[player][opp]]]
    return (troopUpdate, assignments)
    

  def incTroopsIfPossible(self, border, player, is_attack):
    (i1,j1,i2,j2) = border
    t1,t2 = (i1,j1),(i2,j2)
    opp = self.getOwner(t2)
    is_defend = not is_attack
    if not player == self.getOwner(t1):
      raise InvalidRequest('tried to assign troops to unowned border')
    if self.isInternal(border):
      raise InvalidRequest('tried to assign troops to internal border')
    if opp == None:
      raise InvalidRequest('tried to attack a body of water')
    if not self.isValidBorder(border):
      raise InvalidRequest('tried to assign troops to invalid border')
    available = self.available[player][opp]
    defend = self.getDefend(border)
    attack = self.getAttack(border)

    if ((is_attack == (self.getDefend(border) == 0)) or (is_defend == (self.getAttack(border) == 0))) and not available:
      raise InvalidRequest('tried to assign troops when none available')
    else:
        self.borders[i1][j1][i2-i1+1][j2-j1+1] += 2 * int(bool(is_attack)) - 1
        troopval = self.borders[i1][j1][i2-i1+1][j2-j1+1]
        if ((is_attack and troopval <= 0) or (is_defend and troopval >= 0)):
          self.available[player][opp] += 1
        else:
          self.available[player][opp] -= 1
 
    lb = self.getLeftBorder(border)
    rb = self.getRightBorder(border)
    assignments = [self.getAssignment(b) for b in [border, lb,rb] if b]
    troopUpdate = [[opp, self.available[player][opp]]]
    return troopUpdate, assignments

  def getAvailableTroops(self, player):
    if not self.available: return []
    troopUpdate = []
    for opp,t in enumerate(self.available[player]):
      if not opp == player:
        troopUpdate.append([opp,t])
    return troopUpdate

  def getGamestate(self, player):
    gamestate = {}
    gamestate['player'] = player
    gamestate['usernames'] = self.usernames
    gamestate['phase'] = self.getPhase()
    gamestate['turn'] = self.getTurn()
    gamestate['readies'] = self.readies
    gamestate['gamename'] = self.name
    gamestate['nextPhaseTime'] = self.nextPhaseTime.isoformat()
    if self.phase >= 0:
      gamestate['territory_owners'] = self.owners
      gamestate['assignments'] = self.getAllAssignments(player)
      gamestate['troopUpdate'] = self.getAvailableTroops(player)

    return gamestate

    
        
        
        
          
      

