from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0005_examvenue_provision_capabilities"),
    ]

    operations = [
        migrations.AddField(
            model_name="venue",
            name="availability",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
