# Generated by Django 3.0.7 on 2021-03-22 03:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hexgame', '0010_troopcounter_game'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='player_ready',
        ),
        migrations.AddField(
            model_name='player',
            name='ready',
            field=models.BooleanField(default=False),
        ),
    ]
