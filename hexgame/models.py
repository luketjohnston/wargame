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

class GameFile(models.Model):
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
