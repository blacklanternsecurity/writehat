import json
from django.db import models
from writehat.models import *
from writehat.lib.finding import *
from writehat.validation import isValidJSONList
from django.core.exceptions import ValidationError
from writehat.lib.findingForm import CVSSEngagementFindingForm, DREADEngagementFindingForm


log = logging.getLogger(__name__)

class EngagementFinding():

    # holds the fgroup model once it's been instantiated
    _fgroup_object = None

    # override in child class
    formClass = None

    @classmethod
    def new(cls, postData, findingGroupParent):

        engagementFinding = cls()
        form = cls.formClass(postData)
        engagementFinding.updateFromForm(form)
        engagementFinding.clean_fields()
        engagementFinding.findingGroup = findingGroupParent

        return engagementFinding


    @classmethod
    def get_child(cls, id):
        '''
        Tries different types of EngagementFindings until one is found
        Ideally, this should instead be something like:
        EngagementFinding.objects.filter(scoringType='CVSS')
        '''

        finding = None
        try: 
            finding = CVSSEngagementFinding.objects.get(id=id) 
        except CVSSEngagementFinding.DoesNotExist:
            pass

        try:
            finding = DREADEngagementFinding.objects.get(id=id)
        except DREADEngagementFinding.DoesNotExist:
            pass

        try:
            finding = ProactiveEngagementFinding.objects.get(id=id)
        except ProactiveEngagementFinding.DoesNotExist:
            pass

        if finding is None:
            raise FindingError(f"engagementFinding UUID {str(id)} does not exist")
        else:
            log.debug(f'EngagementFinding.get() called, found a {finding.scoringType} class with UUID {id}')
            return finding


    @classmethod
    def from_database(cls, databaseFindingId, findingGroup):
        '''
        Given a database finding, clone it to the appropriate engagement finding class
        '''

        databaseFinding = BaseDatabaseFinding.get_child(id=databaseFindingId)
        if databaseFinding.scoringType == 'CVSS':
            engagementFinding = databaseFinding.clone(
                destinationClass=CVSSEngagementFinding,
                name=databaseFinding.name
            )
        elif databaseFinding.scoringType == 'DREAD':
            engagementFinding = databaseFinding.clone(
                destinationClass=DREADEngagementFinding,
                name=databaseFinding.name
            )
        elif databaseFinding.scoringType == 'PROACTIVE':
            engagementFinding = databaseFinding.clone(
                destinationClass=ProactiveEngagementFinding,
                name=databaseFinding.name
            )
        else:
            raise FindingError(f'Unknown scoringType "{databaseFinding.scoringType}"')

        engagementFinding.findingGroup = findingGroup

        return engagementFinding


    # One of you superclass experts, feel free to make this a magical 3 liner ;)
    def populateForm(self, formClass=None):
        '''
        Copy data from self into self._form_object
        '''

        log.debug(f'{self.className}.populateForm() called')

        if formClass is None:
            formClass = self.formClass

        initialFormData = dict()
        validFormFields = self._formFields(formClass=formClass)

        for label,value in self._modelToForm().items():
            if label in validFormFields:
                initialFormData.update({label: value})

        try:
            self._form_object = formClass(
                initial=initialFormData,
                engagementParent=self.fgroup.engagementParent,
                scoringType=self.fgroup.scoringType
            )
        except TypeError:
            # if this happens, try without the engagementParent
            self._form_object = formClass(
                initial=initialFormData
            )

        return self._form_object


    @property
    def parent(self):

        return self.fgroup.engagement


    @property
    def url(self):
        return f"/engagements/fgroup/finding/edit/{self.id}"



class DREADEngagementFinding(EngagementFinding, DREADFinding):

    findingGroup = models.UUIDField(editable=False, null=True)
    description = MarkdownField(max_length=30000, null=True, blank=True)
    affectedResources = MarkdownField(max_length=30000, null=True, blank=True)
    _dreadImpact = models.TextField(max_length=200, blank=True, null=True, default=str, validators=[isValidJSONList])
    descDamage = MarkdownField(max_length=30000, null=True, blank=True)
    descReproducibility = MarkdownField(max_length=30000, null=True, blank=True)
    descExploitability = MarkdownField(max_length=30000, null=True, blank=True)
    descAffectedUsers = MarkdownField(max_length=30000, null=True, blank=True)
    descDiscoverability = MarkdownField(max_length=30000, null=True, blank=True)
    formClass = DREADEngagementFindingForm


    @property
    def dreadImpact(self):

        log.debug(f'Getting {self.className}.dreadImpact')

        try:
            l = isValidJSONList(self._dreadImpact)
        except ValidationError:
            l = []

        log.debug(f'   {l}')
        return l


    @property
    def _modelFields(self):
        '''
        Returns list of valid field names in model
        '''

        modelFields = super()._modelFields
        modelFields.remove('_dreadImpact')

        return modelFields + ['dreadImpact']


    @dreadImpact.setter
    def dreadImpact(self, dreadImpact):

        log.debug(f'Setting {self.className}.dreadImpact')

        l = json.dumps(dreadImpact)
        isValidJSONList(l)
        log.debug(f'   {l}')
        self._dreadImpact = l


    # I wish we didn't have to define this in both classes, so I am leaving the CVSS/DREAD
    # branch in place in case we redesign the heirarchy later
    @property
    def fgroup(self):

        if self._fgroup_object is None:
            # Importing here to prevent circular import
            from writehat.lib.findingGroup import DREADFindingGroup
            self._fgroup_object = DREADFindingGroup.objects.get(id=self.findingGroup)

        return self._fgroup_object

    @property
    def impact(self):
        choices = {}
        for c in self.formClass.choicesStride:
            choices[c[0]] = c[1]
        for i in self.dreadImpact:
            yield choices[i]
    



class CVSSEngagementFinding(EngagementFinding, CVSSFinding):

    findingGroup = models.UUIDField(editable=False, null=True)
    description = MarkdownField(max_length=30000, null=True, blank=True)
    affectedResources = MarkdownField(max_length=30000, null=True, blank=True)
    proofOfConcept = MarkdownField(max_length=30000, null=True, blank=True)
    formClass = CVSSEngagementFindingForm


    def updateFromPostData(self, postData, blankForm):

        log.debug(f"engagementFindingEdit.updateFromPostData with form {blankForm}")

        form = blankForm(postData)
        self.updateFromForm(form)


    @classmethod
    def list(cls, FindingGroup):
        findings = cls.objects.filter(FindingGroup=FindingGroup)
        for f in findings:
            f.populateForm()
            f.clean_fields()

        return findings

    # I wish we didn't have to define this in both classes, so I am leaving the CVSS/DREAD
    # branch in place in case we redesign the heirarchy later
    @property
    def fgroup(self):

        if self._fgroup_object is None:
            # Importing here to prevent circular import
            from writehat.lib.findingGroup import CVSSFindingGroup
            self._fgroup_object = CVSSFindingGroup.objects.get(id=self.findingGroup)

        return self._fgroup_object



class ProactiveEngagementFinding(EngagementFinding, ProactiveFinding):

    findingGroup = models.UUIDField(editable=False, null=True)
    description = MarkdownField(max_length=30000, null=True, blank=True)
    affectedResources = MarkdownField(max_length=30000, null=True, blank=True)
    formClass = ProactiveEngagementFindingForm

    @property
    def fgroup(self):

        if self._fgroup_object is None:
            # Importing here to prevent circular import
            from writehat.lib.findingGroup import ProactiveFindingGroup
            self._fgroup_object = ProactiveFindingGroup.objects.get(id=self.findingGroup)

        return self._fgroup_object
