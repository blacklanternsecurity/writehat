import re
import uuid
import logging
from enum import Enum
from django import forms
from pathlib import Path
from django.db import models
from django.conf import settings

from writehat.lib.db import *
from writehat.lib.util import *
from writehat.lib.errors import *
from writehat.lib.widget import SelectBase
from django.template.loader import get_template
from writehat.lib.markdown import list_figures

log = logging.getLogger(__name__)

class caption(Enum):
    none = 0
    figure = 1
    table = 2


class BaseComponent():
    '''
    Base component class which all components inherit from
    Must be subclassed
    '''

    ###### OVERRIDE THESE IN THE CHILD CLASS ######

    # human-friendly name
    default_name = 'Base Component'

    # the Django form for this component
    # NOTE: names should match the keys in self.fieldList
    formClass = None

    # dictionary of text fields and their attributes
    # e.g. whether they're markdown, eligible to be templated
    # example: { 'description': StringField(templatable=True, markdown=True) }
    fieldList = {}

    # the HTML template to use, e.g. "componentTemplates/TitlePage.html"
    htmlTemplate = None

    # whether to include in the Table of Contents
    includeInToc = True

    # whether the component should begin on a new page
    pageBreakBefore = True
    
    # whether the component's 'title' field should be rendered
    showTitle = True

    # whether component's 'caption' field is a table or a figure
    captionType = caption.none

    # font awesome icon + color
    iconType = 'fas fa-stream'
    iconColor = '#ddd'

    # cache to store list of figureIDs (when .figures property is accessed)
    _figures = []

    # cache to store instantiated parent report (when .report property is accessed)
    _report = None

    # represents the component's index in the report's hierarchy (e.g. '1.1.3')
    # NOTE: Computed during report rendering; not stored in database
    _index = ""

    # represents the component's level (e.g. whether it is nested inside another
    # component)
    # NOTE: Computed during report rendering; not stored in database
    _level = 1

    ###### LEAVE THESE ALONE ######

    type = Path(__file__).stem

    isContainer = False
    children = []

    startingFields = {
        'type': StringField(templatable=True),
        'pageBreakBefore': BoolField(templatable=True),
        'showTitle': BoolField(templatable=True),
        'reviewStatus': ReviewStatusField(templatable=False),
    }


    @classmethod
    def new(cls, componentType, reportParent=None, databaseParent=None, reportModel=None):
        log.debug(f"{componentType}.new() called; reportParent: {reportParent}")

        componentClass = settings.COMPONENT_CLASSES[componentType]

        componentModel = JSONComponentModel(name=componentClass.default_name, validFields=componentClass.validFields(), \
            reportParent=reportParent, databaseParent=databaseParent)

        # set initial field values to their defaults
        default_values = {k: v.defaultValue for k,v in componentClass.fieldList.items()}
        componentModel.update({
            k: v.defaultValue for k,v in componentClass.fieldList.items()
        })

        componentModel.update({
            'type': componentType,
            'pageBreakBefore': True,
            'showTitle': True,
        })
        componentModel.save()

        component = cls.get(componentModel.id, reportModel=reportModel)

        return component


    @classmethod
    def get(cls, id, reportModel=None):
        log.debug(f"{cls.__name__}.get() called; ID: {id}")

        componentType = BaseComponent.getType(id)

        componentClass = settings.COMPONENT_CLASSES[componentType]
        #log.debug(f"Component valid fields: {validFields}")
        try:
            log.debug(f"Instantiating object of type {componentClass}")
            componentModel = JSONComponentModel(id=id, validFields=componentClass.validFields())
        except DatabaseError:
            raise ComponentDatabaseError(f'No component found with ID {id}')

        #log.debug(f"componentModel in BaseComponent.get.__new__(): {componentModel}")

        component = componentClass(componentModel, reportModel=reportModel)

        #return instantiated component class
        return component


    def __init__(self, componentModel, reportModel=None):

        # store the componentModel
        self._model = componentModel

        # holds / caches instantiated ImageModel objects
        self._figure_objects = None

        # save on database queries by prepopulating component._report
        if reportModel is not None:
            self._report = reportModel

        try:
            log.debug(f'Initializing form class for {self.className}')
            #[ log.debug(f"  {k}: {v}") for k,v in self.json.items() ]
            self.form = self.formClass(initial=self.json)
        except TypeError:
            log.warning(f'No form defined for class {self.className}')

        from ..models import AssigneeUser
        self.startingFields.update({ 'assignee': ForeignKeyField(AssigneeUser) })

        self.fieldList.update(self.startingFields)

        if not self._model.name:
            self._model.name = self.default_name

        if not self.isContainer:
            self.showTitle = self._model.showTitle


    def save(self, updateTimestamp=True):
        log.debug(f"{self.className}.save() called")
        #[ log.debug("  {0}: {1}".format(k, v)) for k,v in self._model.items() ]

        # save the component model itself
        self._model.save(updateTimestamp=updateTimestamp)
        log.debug("Component saved")

        # update modifiedDate property of report
        if updateTimestamp:
            log.debug("Updating Report modified date")
            self.setReportModifiedDate()


    def clone(self, name=None, reportParent=None, templatableOnly=True):

        clonedComponentModel = self._model.clone(
            name=name,
            reportParent=reportParent,
            templatableOnly=templatableOnly
        )
        clonedComponentModel['type'] = self._model['type']
        clonedComponentModel.save()

        clonedComponent = BaseComponent.get(clonedComponentModel.id)
        return clonedComponent


    def find_and_replace(self, str1, str2, caseSensitive=True, markdownOnly=True):
        '''
        Replace all occurrences of str1 with str2
        NOTE: uses regex, do not expose directly to user
        '''

        if str1 and str2 and type(str1) == str and type(str2) == str:
            if caseSensitive:
                r = re.compile(str1)
            else:
                r = re.compile(str1, re.IGNORECASE)

            validFields = self.validFields()
            validFields.update(self._model.startingFields)
            for k,v in self._model.items():
                field = validFields.get(k, '')
                markdown = getattr(field, 'markdown', False)
                if field and type(v) == str and not (markdownOnly and not markdown):
                    self._model[k] = r.sub(str2, v)


    def getattr(self, attr, default=''):
        '''
        Similar to dict.get(), this retrieves an attribute from self._model
        and replaces it with "default" if it's missing or blank
        '''

        attr = self._model.get(attr, '')
        if not attr:
            attr = default
        return attr


    @property
    def json(self):
        log.debug(f"{self.className}.json() called")

        componentJSON = self._model.json
        
        # change _id to id for user friendliness
        _id = componentJSON['_id']
        log.debug("self._id: {0}".format(_id))

        componentJSON.update({'id': _id})

        if 'assignee' in self._model.keys() and self._model.assignee and len(self._model.assignee):
            from ..models import AssigneeUser
            u = AssigneeUser.objects.filter(id = self._model.assignee)
            if len(u):
                componentJSON.update({"assignee_name": u[0], "assignee_id": self._model.assignee})

        return componentJSON


    @classmethod
    def is_markdown(cls, fieldName):

        try:
            if cls.validFields()[fieldName].markdown:
                return True
        except (KeyError, AttributeError):
            pass

        return False


    @property
    def id(self):

        return self._model['_id']



    @property
    def figures(self):
        '''
        Iterate through each markdown field and look for inline figures
        '''

        if self._figure_objects is None:

            self._figure_objects = []

            from writehat.lib.figure import ImageModel

            for fieldname, data in self:
                if self.is_markdown(fieldname):
                    for figure_dict in list_figures(data):
                        figure_id = figure_dict['id']
                        try:
                            figure = ImageModel.get(id=figure_id)
                        except ImageModel.DoesNotExist:
                            log.error(f'Cannot find figure with id {figure_id}')
                            continue
                        figure.size = figure_dict.get('size', 100)
                        figure.caption = figure_dict.get('caption', '')
                        self._figure_objects.append(figure)

        return self._figure_objects


    def updateFromForm(self, postData, formClass=None, selective=False):
        '''
        Selective is true if you _only_ want to update those fields (and not remove/clear ones missing from postData)
        '''

        if formClass is None:
            formClass = self.formClass

        form = formClass(postData)

        if form.is_valid():

            self.form = form
            log.debug(f"Form data: {form.cleaned_data}")

            if selective:
                self._model.update({k:v for k,v in self.form.cleaned_data.items() if k in postData})
            else:
                self._model.update(self.form.cleaned_data)

        else:
            raise ComponentFormError('Invalid Component Form')


    def setReportModifiedDate(self):

        self._getReportParent().save()


    def render(self, context={}):

        context.update(self.json)
        context.update({
            'index': self.index,
            'level': self.level
        })

        template = get_template(self.htmlTemplate)
        context = self.preprocess(context=context)
        contentHTML = template.render(context)
        # styleHTML = get_template(f'snippets/componentCSS.html').render({'component': self.type})
        return contentHTML


    def delete(self):
        log.debug(f"{self.className}.delete() called; UUID: {self.id}")

        self._model.delete()


    @property
    def report(self):
        '''
        Returns instantiated Report object
        Will pull from self._report if already cached
        '''
        if self._report is None:
            self._report = self._getReportParent()

        return self._report


    def _getReportParent(self):
        '''
        Returns instantiated reportParent object
        Retrieves the report object every time
        '''
        from writehat.lib.report import Report, SavedReport
        log.debug(f'Fetching component reportParent (uuid: {self.reportParent})')
        try:
            self._report = Report.get(id=self.reportParent)
        except Report.DoesNotExist:
            try:
                self._report = SavedReport.get(id=self.reportParent)
            except SavedReport.DoesNotExist:
                raise

        return self._report


    @property
    def engagement(self):

        return self.report.engagement
    

    @property
    def engagementParent(self):
        '''
        Returns the engagementParent UUID without needing to instantiate the engagement
        '''
        return self.report.engagementParent


    @property
    def engagement(self):
        '''
        Returns instantiated Engagement object
        Will pull from self._engagement if already cached
        '''

        try:
            return self.report.engagement
        except AttributeError:
            None


    @staticmethod
    def getType(id):
        '''
        given the UUID of a component, return its type
        '''

        log.debug(f"BaseComponent.getType() called; UUID: {id}")

        id = uuid.UUID(str(id))

        # first look in the report database
        result = JSONComponentModel._mongo_op(settings.MONGO_DB['report_' + JSONComponentModel._collection].find_one, \
            {'_id': id, 'type': {'$exists': True}}, {'type': True, '_id': False})

        # then look in the main database if it's not found
        if not result:
            log.debug("Component type not found in report_components; trying components")
            result = JSONComponentModel._mongo_op(settings.MONGO_DB[JSONComponentModel._collection].find_one, \
                {'_id': id, 'type': {'$exists': True}}, {'type': True, '_id': False})

        if result:
            log.debug(f"Found component type: {result['type']}")
            return result['type']
        else:
            log.warn(f'Could not find type for component {id}')
            log.warn(f'')
            raise ComponentError(f'Could not find type for component {id}')

    @property
    def pageBreakBefore(self):
        return self._model['pageBreakBefore']

    @property
    def index(self):
        return self._index;

    @index.setter
    def index(self, index):
        self._index = index;

    @property
    def level(self):
        return self._level;

    @level.setter
    def level(self, level):
        self._level = level;

    @pageBreakBefore.setter
    def pageBreakBefore(self, pageBreakBefore):
        self._model["pageBreakBefore"] = pageBreakBefore


    @property
    def reviewStatusValue(self):
        
        try:
            return ReviewStatusField._choices[self.reviewStatus]
        except (KeyError, AttributeError):
            return ReviewStatusField._choices['unassigned']


    @staticmethod
    def availableComponents():

        for componentID in JSONComponentModel.fetch_all(database=True, report=False):
            yield BaseComponent.get(componentID)


    def preprocess(self, context):
        '''
        Add to or modify "context", then return it
        Should be overridden in the child class if needed
        Note that "context" will already include self.json
        as well as the report & engagement like so:
        context = {
            <self.json>
            'report': Report(),
            'engagement': Engagement()
        }
        '''
        return context


    def __iter__(self):

        for key,value in self._model.items():
            yield key,value


    def __getattr__(self, attr):
        '''
        gets the requested attribute from self._model if it doesn't exist as a class attribute
        '''

        return object.__getattribute__(self, '_model').__getattr__(attr)


    @property
    def className(self):

        return type(self).__name__


    @property
    def parent(self):
    
        return self._getReportParent()


    @property
    def url(self):

        return f"/components/{self.id}/edit"
    


    '''
    Returns a list including this component and its children, recursively
    '''
    def flatten(self):

        flattened = [self]
        for c in self.children:
            flattened += c.flatten()
        return flattened


    @classmethod
    def validFields(cls):
        '''
        Returns all valid fields in dictionary format
        '''
        # all components have these
        validFields = dict(cls.startingFields)
        # these ones are specific to the component
        validFields.update(cls.fieldList)
        return validFields



class ComponentForm(forms.Form):
    name = forms.CharField(label='Title', required=False)
    pageBreakBefore = forms.BooleanField(label='Start On New Page?', required=False)
    showTitle = forms.BooleanField(label='Show Title?', required=False)
    reviewStatus = forms.ChoiceField(label='Review Status', required=False,
                                     choices=ReviewStatusField._choices.items(),
                                     widget=SelectBase(fieldName='reviewStatus',
                                                       attrs={'class': 'review-status'})
                                     )
    assignee = forms.ChoiceField(choices=[], label="Assignee", required=False,
                                 widget=SelectBase(fieldName='assignee',
                                 attrs={'style': 'width: auto;', 'class': 'custom-select'}))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        from ..models import AssigneeUser
        users = AssigneeUser.objects.filter(is_active = True).exclude(username = "admin")
        self.fields['assignee'].choices = [ (None, "") ] + [ (u.id, str(u)) for u in users ]

BaseComponent.formClass = ComponentForm
