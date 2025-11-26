from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0003_alter_uploadlog_uploaded_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentexam",
            name="exam_venue",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="timetabling_system.examvenue",
            ),
        ),
    ]
