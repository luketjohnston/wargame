web: daphne wargame.asgi:application --port $PORT --bind 0.0.0.0
game_manager: python manage.py runworker game_consumer
celery_worker: celery -A wargame worker
