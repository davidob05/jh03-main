from rest_framework import viewsets
from pages.models import Exam
from .serializers import ExamSerializer

class ExamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
