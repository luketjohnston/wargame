from django.urls import path

from . import views

urlpatterns = [
  path('', views.index, name='index'),
  path('board/<int:gameid>/<int:player>/', views.board, name='board'),
  # TODO remove  position view
  path('position/', views.position, name='position'),

]
