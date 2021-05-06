web: daphne wargame.asgi:application --port $PORT --bind 0.0.0.0
manager_and_timeout: python manage.py runworker game_consumer & celery -A wargame worker & wait -n
