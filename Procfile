web: daphne wargame.asgi:application --port $PORT --bind 0.0.0.0
workers: python manage.py runworker game_consumer & celery -A wargame worker & wait -n
