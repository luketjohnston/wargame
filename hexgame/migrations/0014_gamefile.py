# Generated by Django 3.0.7 on 2021-04-01 20:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hexgame', '0013_auto_20210322_1247'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
    ]