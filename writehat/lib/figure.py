from django.db import models
from writehat.lib.errors import *
from writehat.validation import isValidName
from writehat.models import WriteHatBaseModel


class ImageModel(WriteHatBaseModel):

    data = models.BinaryField(blank=True,null=True)
    caption = models.CharField(blank=True, null=True, default=str, max_length=1000, validators=[isValidName])
    size = models.IntegerField(null=True)
    findingParent = models.UUIDField(editable=False, blank=True, null=True)
    contentType = models.CharField(blank=True, null=True, max_length=20)
    order = models.IntegerField(blank=True, null=True)


    def __init__(self, *args, **kwargs):

        self._finding_object = None

        super().__init__(*args, **kwargs)



    @property
    def finding(self):

        if self._finding_object is None:
            from writehat.lib.engagementFinding import EngagementFinding
            self._finding_object = EngagementFinding.get_child(id=self.findingParent)

        return self._finding_object
    