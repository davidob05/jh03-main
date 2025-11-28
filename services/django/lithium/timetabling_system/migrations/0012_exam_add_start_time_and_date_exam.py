from django.db import migrations, models
import django.utils.timezone
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0011_exam_remove_dates_add_is_core_exam"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="date_exam",
            field=models.DateField(default=datetime.date.today),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="exam",
            name="start_time",
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
