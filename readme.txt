To setup everything on ubuntu aws server:
sudo apt install python3, pip3, python3-virtualenv
virtualenv venv, source venv/bin/activate
follow this guide to install redis: https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04
(sudo apt install redis-server, then setup redis as a service so it starts on login)

sudo apt install postgresql
sudo apt install libpq-dev (needed to get psycopg-2 install working)
pip3 install -r requirements.txt

# the below was used to get apache working with mod-wsgi, to run the wsgi.py.
# instead I ended up using daphne.
sudo apt install apache2 apache2-utils ssl-cert libapache2-mod-wsgi-py3
sudo chmod 664 db.sqlite3
sudo chown :www-data db.sqlite3
sudo chown :www-data ~/wargame
sudo chown :www-data gamefiles
sudo service apache2 restart

sudo a2enmod proxy_http # apache proxypass command, to route traffic to daphne


django with mod-wsgi tut: https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/modwsgi/
this one is also very useful (make sure to chown necessary stuff)
https://www.digitalocean.com/community/tutorials/how-to-serve-django-applications-with-apache-and-mod_wsgi-on-ubuntu-14-04


To get heroku working:
need to makemigrations and migrate locally, then commit migration files with git
heroku works by just pushing to the heroku app from git, you can learn it again pretty fast
need to add redis app

if the server hands while writing a file (appears as server 500 error with  no message),
it might be because it's writing to a directory that doesn't exist.

pip installed:
jsonpickle



need to start redis to handle websocket messages
redis-server

to get psycpog2 working, just follow instructions here: 
https://stackoverflow.com/questions/21079820/how-to-find-pg-config-path
basically just need to add path to postresql installation to $PATH


This was the readme from dadsite, maybe has some useful info
to use ImageField, have to install pillow (pip3 install pillow)

python3 -m django runserver

After building model:
python3 manage.py makemigrations
python3 manage.py migrate

python3 manage.py createsuperuser
(standard password, no mark)

pip3 install django-mathfilters
pip3 install pillow


username to login to admin page: 'admin'
password: Standard without mark

to clear and reload the database:
python3 manage.py flush
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py shell
THEN, 
import load_script.py
from the shell



MAKE SURE TO TO THIS BEFORE PRODUCTION
comment out urls.py settings that aren't necessary for production
(the last thing added to the last line of urls.py)

If your static files aren't updating somehow, just remove the "static" and "media" directories
from the project directory, and then run python3 manage.py collectstatic again.

If you can't see the images, you have to flush and reload the database as shown above

For production, need to give apache2 user (www-data) the permission to write to the database file
and log.txt files:
sudo chown www-data:www-data .
sudo chown www-data:www-data db.sqlite3




To get working on godaddy cpanel:
downgrade django to 2.0.7 (the sqlite version wasn't high enough on cpanel for newer versions of django)


