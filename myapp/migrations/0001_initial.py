# Generated by Django 3.0.6 on 2020-06-02 23:37

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Attack',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_strength', models.IntegerField(default=0)),
                ('private_strength', models.IntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='Game',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phase', models.IntegerField(default=0)),
                ('player_ready', models.CharField(default='0000', max_length=4)),
                ('player1', models.CharField(max_length=30, null=True)),
                ('player2', models.CharField(max_length=30, null=True)),
                ('player3', models.CharField(max_length=30, null=True)),
                ('player4', models.CharField(max_length=30, null=True)),
                ('player1key', models.CharField(max_length=50, null=True)),
                ('player2key', models.CharField(max_length=50, null=True)),
                ('player3key', models.CharField(max_length=50, null=True)),
                ('player4key', models.CharField(max_length=50, null=True)),
                ('name', models.CharField(max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name='Territory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('num', models.IntegerField()),
                ('owner', models.IntegerField()),
                ('public_troops', models.IntegerField(default=0)),
                ('private_troops', models.IntegerField(default=0)),
                ('attacks', models.ManyToManyField(related_name='attacks', to='myapp.Attack')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='myapp.Game')),
            ],
        ),
        migrations.AddField(
            model_name='attack',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='myapp.Game'),
        ),
        migrations.AddField(
            model_name='attack',
            name='origin',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='origin', to='myapp.Territory'),
        ),
        migrations.AddField(
            model_name='attack',
            name='target',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='myapp.Territory'),
        ),
    ]
