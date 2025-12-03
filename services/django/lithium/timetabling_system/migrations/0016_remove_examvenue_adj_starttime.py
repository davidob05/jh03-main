from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0015_move_exam_time_to_examvenue"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="examvenue",
            name="adj_starttime",
        ),
    ]

