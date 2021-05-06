from django.db import models
from collections import defaultdict
from django.db.models import Q
from django.db.models import F
import pickle
import json
import random
import os

from django.conf import settings

def getGamepath():
  return os.path.join(settings.LOCAL_FILE_DIR, 'game_savefiles')

class QuickplayCounter(models.Model):
  val = models.IntegerField(default=0)

class GameFile(models.Model):
  running = models.BooleanField(default=False)
  name = models.CharField(max_length=50, unique=True)

  def filepath(self):
    filepath = os.path.join(settings.GAMEFILES_DIR, self.name + '.pickle')
    return filepath
  def getGame(self):
    with open(self.filepath(), 'rb') as f:
      return pickle.load(f)
  def saveGame(self, game):
    print('filepath')
    print(self.filepath())
    with open(self.filepath(), 'wb') as f:
      print(f)
      pickle.dump(game, f)
      print('done dump')

  def cleanupGame(self):
    os.remove(self.filepath())
    self.delete()
  
  # Makes a new gamefile model to service a quickplay request.
  def makeNewQuickplay():
    
    qp_f = QuickplayCounter.objects.all()
    if not qp_f:
      qp = QuickplayCounter(0)
    else: 
      qp = qp_f[0]
    gamename = 'Quickplay_' + str(qp.val)
    while GameFile.objects.filter(name=gamename):
      qp.val += 1;
      gamename = 'Quickplay_' + str(ap.val)
    qp.val += 1;
    qp.save()
    return GameFile(name=gamename)


