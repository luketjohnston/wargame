# Tactics: an experimental wargame


This project is an experimental wargame inspired by the likes of Risk and Diplomacy.
It is currently hosted on a free-tier AWS instance here, check it out!
[Tactics](http://ec2-52-35-106-238.us-west-2.compute.amazonaws.com/hexgame/gamelist/)

# Implementation details

Django-channels is used for websocket communication with players. A global "game manager"
consumer (GameConsumer) processes all game updates. Game state is saved to disk by the game manager,
and updated when a client submits an update. Filenames for these games are stored in the django database.
Users do not log in with usernames/passowrd, the server just uses session storage to identify users
(so you can't login to the same game as the same player from a different device or session). 
Celery is used with a single worker that processes "turn timer up" events. Celery tasks scheduled
to advance the turn timer whenever a game phase progresses, and then the celery worker
signals the game manager GameConsumer that the turn time is up for a specific game. These turn timers
are used to clean up games that no longer have active human players.

On the client side, PIXI is used for implementation of the game interface. 


# Stuff to do:
Need a dedicated clean-up worker. Right now if the server crashes while games are saved to disk, these
games need to be cleaned up manually (because the celery "time up" worker no longer has any tasks 
to signal the GameConsumer to process these).

Right now, very little
of the game interface is implemented with HTML and CSS, so it's not very portable to different
window sizes. Should try to replace PIXI text graphics with HTML and CSS where possible (like
for the game info display)

The AI is very simple - just randomly assigns all troops to borders, as either defenders
or attackers. 

Add user logins? I kind of like the session method, it's simple, reduces the overhead of starting a game...

  

