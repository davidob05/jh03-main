from django.db import migrations, models
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ("timetabling_system", "0006_venue_availability"),
    ]

    operations = [
        migrations.AlterField(
            model_name="provisions",
            name="provisions",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(choices=[
                    ('data_as_presented_to_registry', 'Data as presented to Registry'),
                    ('accessible_exam_hall_ground_or_lift', 'Accessible exam hall: must be ground floor or have reliable lift access available'),
                    ('accessible_hall', 'Accessible hall'),
                    ('allowed_eat_drink', 'Allowed to eat and drink'),
                    ('assisted_evacuation_required', 'Assisted evacuation required'),
                    ('exam_additional_comment', 'Exam Additional Comment'),
                    ('alternative_format_paper', 'Exam paper required in alternative format'),
                    ('extra_time_100', 'Extra time 100%'),
                    ('extra_time_15_per_hour', 'Extra time 15 minutes every hour'),
                    ('extra_time_20_per_hour', 'Extra time 20 minutes every hour'),
                    ('extra_time_30_per_hour', 'Extra time 30 minutes every hour'),
                    ('invigilator_awareness', 'Invigilator awareness'),
                    ('seated_at_back', 'Seated at back'),
                    ('separate_room_not_on_own', 'Separate room not on own'),
                    ('separate_room_on_own', 'Separate room on own'),
                    ('toilet_breaks_required', 'Toilet breaks required'),
                    ('use_computer', 'Use of a computer'),
                    ('use_reader', 'Use of a reader'),
                    ('use_scribe', 'Use of a scribe')
                ], max_length=50),
                blank=True,
                default=list,
                size=None,
            ),
        ),
    ]
