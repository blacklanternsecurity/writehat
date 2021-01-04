from uuid import UUID
from django import forms
from django.db import models
from writehat.models import *
from django.forms import ModelForm, TextInput
from django.core.exceptions import ValidationError
from writehat.lib.errors import EngagementFgroupError
from writehat.lib.engagementFinding import CVSSEngagementFinding, DREADEngagementFinding, ProactiveEngagementFinding
from writehat.lib.findingForm import CVSSEngagementFindingForm, DREADEngagementFindingForm, ProactiveEngagementFindingForm


log = logging.getLogger(__name__)


class BaseFindingGroup(WriteHatBaseModel):

    engagementParent = models.UUIDField(editable=False, null=True)
    prefix = models.CharField(verbose_name="Finding Prefix", max_length=50, default='F')

    ### OVERRIDE IN CHILD CLASS ###

    # scoring type, e.g. CVSS, DREAD (same as findings)
    scoringType = None

    # class for findings
    findingClass = None

    prefix = 'F'


    @classmethod
    def new(cls, uuid, postData):
        findingGroup = cls()
        findingGroup.engagementParent = uuid
        form = cls.formClass(postData)
        findingGroup.updateFromForm(form)
        findingGroup.clean_fields()
        return findingGroup


    def __init__(self, *args, **kwargs):

        # hold instantiated finding objects
        self._finding_objects = None

        # holds instantiated engagement object
        self._engagement_object = None

        # holds instantiated report object
        self._report_object = None

        super().__init__(*args, **kwargs)


    @classmethod
    def get_child(cls, **kwargs):
        '''
        Get findingGroup without knowing its type
        '''

        _id = kwargs.get('id', None)

        for findingGroupClass in cls.__subclasses__():
            try:
                return findingGroupClass.objects.get(**kwargs)
            except findingGroupClass.DoesNotExist:
                continue

        raise EngagementFgroupError(f'Finding group with ID {_id} not found')


    @classmethod
    def filter_children(cls, **kwargs):
        '''
        Filter on findingGroups of all types
        '''

        findingGroups = []

        for findingGroupClass in cls.__subclasses__():
            try:
                findingGroups += list(findingGroupClass.objects.filter(**kwargs))
            except (findingGroupClass.DoesNotExist, ValidationError):
                continue

        return findingGroups


    def delete(self):
        log.debug(f"{self.className}.delete() cascading delete sequence intiated for fgroup with UUID: {self.id}")
        for finding in self.findings:
            log.debug(f"{finding.className}.delete() deleting finding with UUID: {finding.id}")
            finding.delete()
        log.debug(f"{self.className}.deleting finding group with UUID: {self.id}")
        super().delete()
      



    @property
    def report(self):

        return self._report_object
    


    @classmethod
    def FindingsGroupSelect(cls, engagementId, scoringType=None):

        findingGroupsList = []

        findingGroups = cls.filter_children(
            engagementParent=engagementId
        )

        if scoringType is not None:
            try:
                scoringType = cls.scoringType.field.get_default()
            except AttributeError:
                pass

        for i in findingGroups:
            if scoringType is None or i.scoringType == scoringType:
                findingGroupsList.append({'id': i.id, 'name': i.name})

        findingGroupsList.insert(0, {'id': '', 'name': ''})
        return findingGroupsList


    @property
    def findings(self):

        if self._finding_objects is None:

            self._finding_objects = []

            findings = list(self.findingClass.objects.filter(findingGroup=self.id))
            findings.sort(key=lambda x: x.name)
            findings.sort(key=lambda x: x.score, reverse=True)
            for i, finding in enumerate(findings):
                if (self.report is None) or (not self.report.finding_uuids) or (UUID(str(finding.id)) in self.report.finding_uuids):
                    finding.number = f'{self.prefix}{i+1:03d}'
                    finding._fgroup_object = self
                    self._finding_objects.append(finding)

        return self._finding_objects


    @property
    def engagement(self):

        if self._engagement_object is None:
            from writehat.lib.engagement import Engagement
            self._engagement_object = Engagement.get(id=self.engagementParent)
        return self._engagement_object


    @property
    def findingForm(self):

        return self.findingClass.formClass(
            engagementParent=self.engagementParent,
            scoringType=self.scoringType
        )



    def __iter__(self):

        for finding in self.findings:
            yield finding

    @property
    def parent(self):
        return self.engagement

    @property
    def url(self):
        return f"/engagements/fgroup/status/{self.id}"




class CVSSFindingGroup(BaseFindingGroup):

    findingClass = CVSSEngagementFinding
    scoringType = models.CharField(default='CVSS', editable=False, max_length=50)
    prefix = models.CharField(verbose_name="Finding Prefix", max_length=50, default='T')



class DREADFindingGroup(BaseFindingGroup):

    findingClass = DREADEngagementFinding
    scoringType = models.CharField(default='DREAD', editable=False, max_length=50)
    prefix = models.CharField(verbose_name="Finding Prefix", max_length=50, default='NT')



class ProactiveFindingGroup(BaseFindingGroup):

    findingClass = ProactiveEngagementFinding
    scoringType = models.CharField(default='PROACTIVE', editable=False, max_length=50)
    prefix = models.CharField(verbose_name="Finding Prefix", max_length=50, default='P')



class FgroupForm(ModelForm):
    class Meta:
        model = BaseFindingGroup
        fields = '__all__'
        widgets = {
            'name': TextInput(attrs={'required': 'true'}),
            'title': TextInput(attrs={'class': 'form-input'}),
            'prefix': TextInput(attrs={'class': 'form-input'}),
        }
        labels = {
            'name': 'Finding Group Name',
            'prefix': 'Finding Prefix',
        }


class FgroupForm(forms.Form):

    name = forms.CharField(
        label='Finding Group Name', 
        widget=forms.TextInput(attrs={'class': 'name-validation'}),
        max_length=50
    )

    prefix = forms.CharField(
        label='Finding Prefix', 
        widget=forms.TextInput(attrs={'class': 'name-validation'}),
        max_length=50
    )



BaseFindingGroup.formClass = FgroupForm
