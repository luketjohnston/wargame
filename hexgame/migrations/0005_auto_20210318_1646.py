# Generated by Django 3.0.7 on 2021-03-18 23:46

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hexgame', '0004_auto_20210315_2124'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='available_troops',
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name='Border',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attack', models.IntegerField(default=0)),
                ('defense', models.IntegerField(default=0)),
                ('t1', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='border_t1', to='hexgame.Territory')),
                ('t2', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='border_t2', to='hexgame.Territory')),
            ],
        ),
    ]
