from django.db import migrations, models
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0007_alter_provisions_provisions_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="venue",
            name="provision_capabilities",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[
                        ("separate_room_on_own", "Separate room on own"),
                        ("separate_room_not_on_own", "Separate room not on own"),
                        ("use_computer", "Use of a computer"),
                        ("accessible_hall", "Accessible hall"),
                    ],
                    max_length=40,
                ),
                blank=True,
                default=list,
                size=None,
            ),
        ),
    ]
