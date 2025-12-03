from django.db import migrations, models


def move_exam_time_to_examvenue(apps, schema_editor):
    Exam = apps.get_model("timetabling_system", "Exam")
    ExamVenue = apps.get_model("timetabling_system", "ExamVenue")

    for exam in Exam.objects.all():
        start_time = getattr(exam, "start_time", None)
        exam_length = getattr(exam, "exam_length", None)
        if start_time is None and exam_length is None:
            continue

        exam_venues = ExamVenue.objects.filter(exam_id=exam.pk)
        for exam_venue in exam_venues:
            updated_fields = []
            if start_time and exam_venue.start_time != start_time:
                exam_venue.start_time = start_time
                updated_fields.append("start_time")
            if exam_length is not None and exam_venue.exam_length != exam_length:
                exam_venue.exam_length = exam_length
                updated_fields.append("exam_length")
            if updated_fields:
                exam_venue.save(update_fields=updated_fields)


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0014_remove_exam_date_exam_examvenue_core"),
    ]

    operations = [
        migrations.AddField(
            model_name="examvenue",
            name="exam_length",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="examvenue",
            name="start_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(move_exam_time_to_examvenue, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="exam",
            name="exam_length",
        ),
        migrations.RemoveField(
            model_name="exam",
            name="start_time",
        ),
    ]

