from django.db import models


class Structured(models.Model):
    depth = models.PositiveIntegerField(default=1)

    class Meta:
        abstract = True
