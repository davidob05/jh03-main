from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0010_merge_20250101_0000"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="exam",
            name="date_exam",
        ),
        migrations.RemoveField(
            model_name="exam",
            name="start_time",
        ),
        migrations.AddField(
            model_name="examvenue",
            name="is_core_exam",
            field=models.BooleanField(default=False),
        ),
    ]
