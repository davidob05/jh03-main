from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0016_remove_examvenue_adj_starttime"),
    ]

    operations = [
        migrations.AlterField(
            model_name="examvenue",
            name="venue",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="timetabling_system.venue",
            ),
        ),
    ]
