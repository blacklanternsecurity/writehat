import logging
from django.db import models
from writehat.models import *
from writehat.lib.cvss import *
from writehat.lib.dread import *
from writehat.lib.errors import *
from writehat.lib.figure import *
from writehat.lib.markdown import *
from writehat.lib.findingForm import *
from writehat.lib.findingCategory import *
from writehat.lib.revision import Revision


log = logging.getLogger(__name__)
todo_re = r"\{\s{0,2}[Tt][Oo][Dd][Oo](?P<todo_note>[|][^}]+)?\s{0,2}\}"

class BaseDatabaseFinding(WriteHatBaseModel):

    # Associated form, override as necessary
    formClass = FindingForm

    # These values would be editable only by managing users
    categoryID = models.UUIDField(editable=False, null=True) # References a finding category object
    isApproved = models.BooleanField(default=False, null=True, blank=True)

    # These values comes from the user when they are submitting a new finding
    background = MarkdownField(max_length=30000, null=True, blank=True)
    remediation = MarkdownField(max_length=30000, null=True, blank=True)
    references = MarkdownField(max_length=30000, null=True, blank=True)

    # Overridden by child class
    scoringType = models.CharField(default='None', max_length=50)

    # Don't create a table for this class
    class Meta:
        abstract = True


    @classmethod
    def new(cls, postData):

        finding = cls()
        finding.updateFromPostData(postData)
        finding.clean_fields()
        return finding


    def delete(self):
        log.debug(f"{self.className}.delete(): cascading Revision delete initiated {self.id}")
        revisions = Revision.objects.filter(parentId=self.id)
        for revision in revisions:
            log.debug(f"{revision.className}.delete() deleting Revision with UUID: {revision.id}")
            revision.delete()
        log.debug(f"{self.className}.deleting finding with UUID: {self.id}")
        super().delete()


    def __init__(self, *args, **kwargs):

        # holds the category model once it's been instantiated
        self._category_object = None

        # holds cached figures for performance reasons
        self._figure_objects = None

        # Placeholder - overwritten when accessed through engagement or report
        self.number = '001'
        self.prefix = 'F'


        super().__init__(*args, **kwargs)


    @classmethod
    def get_child(cls, id):

        finding = None
        try:
            finding = CVSSDatabaseFinding.objects.get(id=id) 
        except CVSSDatabaseFinding.DoesNotExist:
            try:
                finding = DREADDatabaseFinding.objects.get(id=id)
            except DREADDatabaseFinding.DoesNotExist:
                try:
                    finding = ProactiveDatabaseFinding.objects.get(id=id)
                except ProactiveDatabaseFinding.DoesNotExist:
                    pass

        if finding is None:
            raise FindingError(f"DatabaseFinding UUID {str(id)} does not exist")
        else:
            log.debug(f'BaseDatabaseFinding.get() called, found a {finding.scoringType} class with UUID {id}')
            finding.populateForm()
            finding.clean_fields()
            return finding


    @classmethod
    def filter_children(cls, **kwargs):

        findings = []

        for findingClass in [
            CVSSDatabaseFinding,
            DREADDatabaseFinding,
            ProactiveDatabaseFinding
        ]:
            findings += list(findingClass.objects.filter(**kwargs))

        return findings


    @classmethod
    def all_children(cls, scoringType=None):

        findings = []

        if scoringType in [None, 'CVSS']:
            findings += list(CVSSDatabaseFinding.objects.all())
        if scoringType in [None, 'DREAD']:
            findings += list(DREADDatabaseFinding.objects.all())
        if scoringType in [None, 'PROACTIVE']:
            findings += list(ProactiveDatabaseFinding.objects.all())

        return findings


    @property
    def category(self):

        if self._category_object is None:
            self._category_object = DatabaseFindingCategory.objects.get(id=self.categoryID)

        return self._category_object


    @property
    def categoryFull(self):

        return self.category.fullName


    @property
    def figures(self):

        if self._figure_objects is None:
            self._figure_objects = []

            from writehat.lib.figure import ImageModel

            log.debug(f'called {self.className}.figures()')

            # figures from markdown fields come first
            for field in self._meta.get_fields():
                try:
                    if field.markdown is True:
                        data = getattr(self, field.name)
                        for figure_dict in list_figures(data):
                            try:
                                figure = ImageModel.get(id=figure_dict['id'])
                            except ImageModel.DoesNotExist:
                                continue
                            figure.size = figure_dict.get('size', 100)
                            figure.caption = figure_dict.get('caption', '')
                            log.debug('  figure found (within finding): ' + figure.caption)
                            self._figure_objects.append(figure)

                except AttributeError:
                    continue

            for figure in self.figures_ending:
                self._figure_objects.append(figure)

        for figure in self._figure_objects:
            figure._finding_object = self

        return self._figure_objects


    @property
    def figures_ending(self):

        # then the other ones
        for figure in ImageModel.objects.filter(findingParent=self.id).order_by('order'):
            log.debug('  figure found (after finding): ' + figure.caption)
            yield figure


    @property
    def parent(self):

        return {
            'url': '/findings',
            'name': 'Findings Database'
        }


    @property
    def todoItems(self):
        out = []
        for field in self._meta.get_fields():
            try:
                if field.markdown:
                    log.debug(field.name)
                    data = str(getattr(self, field.name, ""))
                    match = re.search(todo_re, data)
                    if match is not None:
                        out.append(field.name)
            except AttributeError:
                continue
        return out


class DREADFinding(BaseDatabaseFinding):

    formClass = DREADEngagementFindingForm
    scoringType = models.CharField(default='DREAD', editable=False, max_length=50)
    vector = models.CharField(max_length=150, null=True, blank=True)
    htmlTemplate = 'componentTemplates/DREADFinding.html'
    abridgedTemplate = 'componentTemplates/DREADFindingShort.html'
    summaryTemplate = 'componentTemplates/FindingsSummary.html'

    @property
    def score(self):
        log.debug(f'DREAD score called with vector string: ({self.vector})')
        dread = DREAD(self.vector)
        return dread.score


    @property
    def severity(self):

        return self.dread.severity


    def _formToModel(self, form):

        formData = super()._formToModel(form)
        formData.update({
            'vector': DREAD.createVector(formData)
        })

        return formData



    def _modelToForm(self):

        formData = super()._modelToForm()
        formData.pop('vector')
        formData.update(self.dread.dict)
        return formData

    @property
    def dread(self):
        return DREAD(self.vector)



class CVSSFinding(BaseDatabaseFinding):

    formClass = CVSSEngagementFindingForm
    scoringType = models.CharField(default='CVSS', editable=False, max_length=50)
    toolsUsed = MarkdownField(max_length=30000, null=True, blank=True)
    vector = models.CharField(max_length=150, null=True, blank=True)
    htmlTemplate = 'componentTemplates/CVSSFinding.html'
    abridgedTemplate = 'componentTemplates/CVSSFindingShort.html'
    summaryTemplate = 'componentTemplates/FindingsSummary.html'

    # Don't create a table for this class
    class Meta:
        abstract = True


    @property
    def score(self):

        log.debug(f'CVSS score called with vector string: ({self.vector})')
        cvss = CVSS(self.vector)
        return cvss.score


    @property
    def severity(self):

        return self.cvss.severity


    @property
    def cvss(self):

        return CVSS(self.vector)


    def _formToModel(self, form):

        formData = super()._formToModel(form)

        formData.update({
            'vector': CVSS.createVector(formData)
        })

        return formData


    def _modelToForm(self):

        formData = super()._modelToForm()
        formData.pop('vector')
        formData.update(self.cvss.dict)
        return formData



class ProactiveFinding(BaseDatabaseFinding):

    formClass = ProactiveEngagementFindingForm
    scoringType = models.CharField(default='PROACTIVE', editable=False, max_length=50)
    htmlTemplate = 'componentTemplates/ProactiveFinding.html'
    abridgedTemplate = 'componentTemplates/ProactiveFindingShort.html'
    summaryTemplate = 'componentTemplates/FindingsSummary.html'

    @property
    def score(self):
        return 0

    @property
    def severity(self):
        return 'Proactive'



# this is a bit of a hack, but probably preferable to reworking the whole system at this point
class DatabaseOnlyFinding:

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
        self._form_object = formClass(initial=initialFormData)
        return self._form_object



class CVSSDatabaseFinding(DatabaseOnlyFinding,CVSSFinding):

    formClass = CVSSForm


class DREADDatabaseFinding(DatabaseOnlyFinding,DREADFinding):

    formClass = DREADForm


class ProactiveDatabaseFinding(DatabaseOnlyFinding,ProactiveFinding):

    formClass = ProactiveForm



# Recursive function for building JSON object of category tree
def growFindingsTree(categoryID, name="root", categoriesOnly=False):

    # The dictionary key is the category ID and the name
    findingsTree = {'findings': {}, 'name': name, 'categoryChildren': {}}

    # Find the related findings and add them to the findings list, we send them in when we recurse
    if not categoriesOnly:
        relatedFindings = BaseDatabaseFinding.filter_children(categoryID=categoryID)
        for relatedFinding in relatedFindings:
            findingsTree['findings'][str(relatedFinding.id)] = {'name': relatedFinding.name, 'scoringType': relatedFinding.scoringType}

    # Get the children for the current item
    children = DatabaseFindingCategory.objects.filter(categoryParent=categoryID)
    # Iterate through the children
    for child in children:
        # recursively call this function until we hit end nodes without children
        findingsTree['categoryChildren'].update(growFindingsTree(\
            str(child.id), name=child.name, categoriesOnly=categoriesOnly))

    # Return the complete dictionary (or a dictionary for our current branch if we are in recursion)
    return { categoryID: findingsTree }


def getFindingsTree(categoriesOnly=False):

    log.debug('[!]Running getFindingsTree')
    rootNode = DatabaseFindingCategory.getRootNode()
    findingsTree = growFindingsTree(str(rootNode.id))

    return findingsTree


def getFindingsFlat(scoringType):

    log.info(f'getFindingsFlat() called with scoringType: {scoringType}')
    flatFindingList = []
    findings = BaseDatabaseFinding.all_children(scoringType=scoringType)
    for finding in findings:
        associatedFindingCategory = finding.category
        breadcrumbs = associatedFindingCategory.getCategoryBreadcrumbs()
        #        if currentNode.categoryParent
        selectOption = {'id':str(finding.id),'name':' -> '.join(breadcrumbs[::-1]) + ' -> [ ' + finding.name + ' ]'}
        log.info(selectOption)
        flatFindingList.append(selectOption)
    return sorted(flatFindingList, key=lambda k: k['name'])
