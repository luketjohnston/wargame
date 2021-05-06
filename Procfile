web: daphne wargame.asgi:application --port $PORT --bind 0.0.0.0
worker: python manage.py runworker game_consumer
worker: celery -A wargame worker
