import re
import logging
from uuid import UUID
from django import forms
from django.db import models
from writehat.models import *
from writehat.lib.util import *
from writehat.lib.errors import *
from writehat.validation import *
from writehat.components.base import *
from django.core.exceptions import ValidationError
from writehat.lib.pageTemplate import PageTemplate
from writehat.lib.findingGroup import BaseFindingGroup
from writehat.lib.widget import SavedReportBootstrapSelect, PageTemplateSelect

log = logging.getLogger(__name__)


class BaseReport(WriteHatBaseModel):
    '''
    Base report class, not used directly
    Holds report data including JSON-serialized dictionary of components
    '''

    class Meta:
        abstract = True
    
    # JSON-serialized dictionary of component UUIDs
    _components = models.TextField(blank=True, default=str, validators=[isValidComponentJSON])
    pageTemplateID = models.UUIDField(null=True, blank=True)

    @classmethod
    def new(cls, name, components=None, engagementParent=None):
        log.debug(f"{type(cls).__name__}.new()")

        log.debug(f"components: {components}")

        reportModel = cls(name=name)
        reportModel.engagementParent = engagementParent
        #reportModel.save()

        if components is not None:
            newComponents = reportModel.createComponents(components)
            log.debug(f"newComponents: {newComponents}")
            reportModel._components = json.dumps(newComponents,cls=UUIDEncoder)

        reportModel.save()

        return reportModel


    def __init__(self, *args, **kwargs):

        # holds the deserialized contents of self._components
        self._component_objects = None
        # holds cached figures for performance reasons
        self._figures = None

        # when rendering, this holds the finding groups in the order they appear in the report
        # this is automatically populated when .components is called
        self._ordered_fgroups = None
        self._ordered_fgroups_populated = False

        # holds cached page template
        self._pageTemplate_object = None

        super().__init__(*args, **kwargs)


    @property
    def components(self):
        '''
        unserializes the component JSON if it hasn't been already
        yields an unflattened list of component objects
        '''

        if self._component_objects is None:
            try:
                self._component_objects = self.populateComponentChildren(json.loads(self._components))
            except json.decoder.JSONDecodeError:
                # JSON string is blank, component list is empty
                self._component_objects = []

            for component in self._component_objects:
                component._report = self

        self._ordered_fgroups_populated = True

        return self._component_objects


    @property
    def pageTemplate(self):

        if self._pageTemplate_object is None:
            try:
                self._pageTemplate_object = PageTemplate.get(id=self.pageTemplateID)
            except PageTemplate.DoesNotExist:
                pass

        if self._pageTemplate_object is None:
            try:
                self._pageTemplate_object = PageTemplate.objects.filter(default=True)[0]
            except IndexError:
                self._pageTemplate_object = PageTemplate.new()

        self._pageTemplate_object.report = self
        return self._pageTemplate_object


    @components.setter
    def components(self, components):

        self._component_objects = components


    @property
    def ordered_fgroups(self):

        if self._ordered_fgroups is None:
            # iterating through components automatically populates self._ordered_fgroups
            list(self.components)

        log.debug(f'ordered_fgroups: {self._ordered_fgroups}')
        return self._ordered_fgroups
    


    @property
    def flattened_components(self):

        for component in self.components:
            for c in component.flatten():
                yield c


    @property
    def figures(self):
        '''
        NOTE: Since findings are stored in django models and markdown fields are not,
        generating a list of figures in order is problematic.
        '''

        if self._figures is None:
            self._figures = []
            for component in self.flattened_components:
                log.debug(f"Processing figures for component '{component.name}'")
                for figure in component.figures:
                    log.debug(f"   found figure '{figure.caption}'")
                    self._figures.append(figure)

        return self._figures


    def createComponents(self, newComponentTree, existingUUIDs=None):
        if not existingUUIDs:
            existingUUIDs = set()

        '''
        Recursive component to update() since we need to maintain the component
        hierarchy. Walk the tree looking for components without uuids and create them
        '''
        log.debug("existingUUIDs at beginning of createComponents:")
        [ log.debug(f"  {e}") for e in existingUUIDs ] if len(existingUUIDs) else log.debug("  (empty)")
        tmpComponents = []
        for c in newComponentTree:

            # if it's a new component
            if 'uuid' not in c:
                log.debug("Key 'uuid' NOT in c")
                log.debug("Found new component: {0}".format(c['type']))
                componentObj = BaseComponent.new(
                    componentType=c['type'],
                    reportParent=self.id,
                    reportModel=self
                )
                log.debug(f"newComponent: {componentObj._model}")
                newComponent = {
                    'type': c['type'],
                    'uuid': componentObj.id
                }
                c['uuid'] = newComponent['uuid']

            # if it's a duplicated component
            else:
                log.debug("Current component has 'uuid' field")
                componentID = UUID(str(c['uuid']))
                if componentID in existingUUIDs:
                    log.debug("Component is in existingUUIDs")
                    componentObj = BaseComponent.get(c['uuid'])
                    componentClone = componentObj.clone(
                        reportParent=self.id,
                        templatableOnly=False
                    )
                    log.debug(f"Cloned component; new UUID: {componentClone.id}")
                    c['uuid'] = componentClone.id
                    existingUUIDs.add(UUID(str(componentClone.id)))
                else:
                    log.debug("Component is not in existingUUIDs; not cloning")
                existingUUIDs.add(componentID)

            if 'children' in c.keys() and c['children']:
                c['children'] = self.createComponents(
                    c['children'],
                    existingUUIDs=existingUUIDs
                )

            tmpComponents.append(c)

        return tmpComponents


    def update(self, componentJSON=None, name=None, pageTemplate=None):
        log.debug("Report.update() called")

        # handle name
        if name is not None:
            log.debug(f"Setting report.name to {name}")
            self.name = name

        self.pageTemplateID = pageTemplate

        # handle components
        if componentJSON is not None:
            log.debug("componentJSON at beginning of update()")
            [ log.debug(f"  {c})") for c in componentJSON ]

            # security check on type field
            try:
                isValidComponentList(componentJSON, new=True)
            except ValidationError as e:
                raise ReportValidationError(f'Failed to update report: {e}')

            newComponentIDs = self.flattenComponentIDs(componentJSON)
            oldComponentIDs = self.flattenComponentIDs(self.components)

            # Check for deleted components (in oldComponentIDs but not newComponentIDs)
            for old_c in oldComponentIDs:
                if old_c not in newComponentIDs:
                    log.debug(f"Deleting removed component: {old_c}")
                    BaseComponent.get(old_c).delete()

            # Check for new components (ones without UUIDs)
#           logLevel = log.level
#           log.setLevel(logging.DEBUG)
#           log.debug("Increased log level for createComponents() call\n\n")
            newComponents = self.createComponents(componentJSON)
#           log.debug("Restoring original log level")
#           log.setLevel(logLevel)

            log.debug("componentJSON before overwrite:")
            [ log.debug(f"  {k}: {v}") for k,v in enumerate(componentJSON) ]

            log.debug("newComponents before overwrite:")
            [ log.debug(f"  {k}: {newComponents[k]}") for k in range(len(newComponents)) ]

            # Save the reports component
            log.debug(f"self._components before overwrite:")
            j = json.loads(self._components)
            [ log.debug(f"  {k}: {j[k]}") for k in range(len(j)) ]

            self._components = json.dumps(newComponents, cls=UUIDEncoder)

            log.debug("componentJSON at Report.save():")
            [ log.debug(f"  {k}: {v}") for k,v in enumerate(componentJSON) ]

            log.debug("newComponents at Report.save():")
            [ log.debug(f"  {k}: {newComponents[k]}") for k in range(len(newComponents)) ]

            # Save the reports component
            log.debug(f"self._components at Report.save():")
            j = json.loads(self._components)
            [ log.debug(f"  {k}: {j[k]}") for k in range(len(j)) ]

            self.save()

            # Return our (possibly) modified component list
            return componentJSON

        return dict()


    def populateComponentChildren(self, model, prefix='', level=1):

        components = []
        counter = 0

        if self._ordered_fgroups is None:
            self._ordered_fgroups = []

        for json_component in model:
            uuid = json_component['uuid']
            component = BaseComponent.get(uuid)

            # instantiate finding groups and track of finding numbers
            if self._ordered_fgroups_populated == False:
                try:
                    fgroup_id = component._model['findingGroup']
                    findingGroup = component.getFindingGroup

                    if findingGroup and findingGroup not in self._ordered_fgroups and findingGroup.engagementParent == self.engagementParent:
                        findingGroup._report_object = self
                        self._ordered_fgroups.append(findingGroup)

                except (KeyError, EngagementFgroupError):
                    pass

            # performance optimization
            component._report = self

            component.level = level
            if component.includeInToc and component.showTitle:
                counter += 1
                new_prefix = f"{prefix}{counter}."
                component.index = new_prefix

            if 'children' in json_component.keys() and len(json_component['children']):
                component.children = self.populateComponentChildren(json_component['children'], new_prefix, level + 1)

            components.append(component)

        return components


    # Recursively flatten nested component IDs
    @classmethod
    def flattenComponentIDs(cls, componentJSON):

        log.debug("report.flattenComponentIDs() called")
        componentIDs = []
        for c in componentJSON:
            if not 'uuid' in c or not c['uuid']:
                continue
            log.debug("  Component: {0}".format(c['uuid']))
            componentIDs.append(c['uuid'])
            if 'children' in c.keys():
                log.debug("  Processing {0} children".format(len(c['children'])))
                componentIDs += cls.flattenComponentIDs(c['children'])

        return componentIDs


    def cloneComponents(self, reportParent, componentJSON=None, componentIdMappings=None, templatableOnly=True):

        log.debug("report.cloneComponents() called")

        if componentJSON is None:
            componentJSON = json.loads(self._components)

        # keeps track of old and new component IDs (if later find-and-replacing is required)
        # used to prevent references to other components from breaking
        if componentIdMappings is None:
            componentIdMappings = dict()

        clonedJSON = []

        for component in componentJSON:

            if not 'uuid' in component or not component['uuid']:
                continue
            clonedComponent = BaseComponent.get(component['uuid']).clone(reportParent=reportParent, templatableOnly=templatableOnly)
            clonedComponent = {'uuid': str(clonedComponent.id), 'type': component['type']}
            if 'children' in component.keys():
                clonedComponent['children'] = self.cloneComponents(reportParent, component['children'], componentIdMappings)[0]

            clonedJSON.append(clonedComponent)
            componentIdMappings.update({component['uuid']: clonedComponent['uuid']})

        return (clonedJSON, componentIdMappings)


    def clone(self, name=None, destinationClass=None, templatableOnly=True):

        log.debug('Calling report.log()')
        log.debug(f' Current UUID: {self.id}')


        if destinationClass is None:
            destinationClass = self.__class__
        
        clonedReport = super(BaseReport, self).clone(name=name, destinationClass=destinationClass)
        clonedReport.save(updateTimestamp=False)

        log.debug(clonedReport.id)
        clonedComponents, componentIdMappings = self.cloneComponents(reportParent=clonedReport.id, templatableOnly=templatableOnly)
        clonedReport._components = json.dumps(clonedComponents)
        clonedReport._component_objects = None

        # replace in-text references with new UUIDs
        for component in clonedReport.flattened_components:
            for old_id, new_id in componentIdMappings.items():
                component.find_and_replace(str(old_id), str(new_id), caseSensitive=False)
            #try:
            #    component._model['findingGroup'] = component.getFindingGroup.id
            #except AttributeError:
            #    pass
            component.save(updateTimestamp=False)

        clonedReport.save(updateTimestamp=False)
        clonedReport._component_objects = None

        log.debug(f' Saved UUID: {clonedReport.id}')

        return clonedReport


    def render(self):

        rendered_components = self.renderComponents()

        master_template = get_template('reportTemplates/reportBase.html')
        #page_footer = get_template('reportTemplates/reportPageFooter.html')
        rendered = master_template.render({ 'report': self, 'components': rendered_components, 'footer': self.pageTemplate.renderFooter(), 'header': self.pageTemplate.renderHeader() })

        return rendered


    # Returns a list of rendered report components
    '''
    def renderComponents(self):

        return [component.render({'report': self}) for component in self]
    '''
        # Returns a list of rendered report components
    def renderComponents(self):

        rendered_components = []

        for order, component in enumerate(self):
            if order == 0:
                log.debug(f"Removing page break from first component {component.name}")
                component.pageBreakBefore = False

            rendered_components.append(component.render({
                'report': self
            }))

        return rendered_components



    @property
    def numComponents(self):
        '''
        Returns number of components without instantiating them
        '''

        return self._numComponents()



    def _numComponents(self, d=None):
        '''
        Return the total number of components, not counting containers.
        '''

        num_components = 0

        if d is None:
            d = json.loads(self._components)

        for c in d:
            if 'children' in c:
                num_components += self._numComponents(d=c.get('children'))
            else:
                num_components += 1

        return num_components


    def find_and_replace(self, str1, str2, caseSensitive=True, updateTimestamp=True, markdownOnly=True):
        '''
        Replace all occurrences of str1 with str2
        '''

        super().find_and_replace(str1, str2, caseSensitive=caseSensitive, markdownOnly=markdownOnly)

        for component in self.flattened_components:
            component.find_and_replace(str1, str2, caseSensitive=caseSensitive, markdownOnly=markdownOnly)
            component.save(updateTimestamp=updateTimestamp)


    def delete(self):

        try:
            for component in self:
                component.delete()
        except ComponentError as e:
            log.debug(f'Error deleting report components: {e}')

        super().delete()


    def __iter__(self):
        '''
        yields all Component() objects in report, flattened
        '''

        for component in self.flattened_components:
            yield component




class Report(BaseReport):
    '''
    Report attached to an engagement with findings, etc.
    '''

    engagementParent = models.UUIDField(editable=False,null=True,unique=False)
    # if requested, holds the instantiated EngagementParent
    _engagement_object = None

    # JSON-serialized list of finding UUIDs
    _findings = models.TextField(blank=True, default=str, validators=[isValidJSON])

    def render(self):

        rendered_components = self.renderComponents()
        master_template = get_template('reportTemplates/reportBase.html')
        # Note: {{ pageFooter }} must occur before rendered components in
        # reportBase.html or it will only appear on the last page. To edit
        # footer contents, modify templates/reportTemplates/reportPageFooter.html
        rendered = master_template.render({ 
            'components': rendered_components,
            'report': self,
            'footer': self.pageTemplate.renderFooter(),
            'header': self.pageTemplate.renderHeader(),
        })

        return rendered


    @property
    def engagement(self):

        from writehat.lib.engagement import Engagement

        if self._engagement_object is None:
            try:
                self._engagement_object = Engagement.get(id=self.engagementParent)
            except Engagement.DoesNotExist:
                log.error(f'Engagement {self.engagementParent} not found')

        return self._engagement_object


    @property
    def findings(self):
        '''
        NOTE: Lists ALL findings from ALL finding groups
        NOTE: Automatically removes any invalid/deleted entries from self._findings
        Call .save() after running this method to save the changes
        '''

        log.debug(f'Called {self.className}.findings()')
        findings = []

        requested_finding_uuids = list(self.finding_uuids)
        validated_finding_uuids = []

        # if no findings are specified, give all of them
        if not requested_finding_uuids:
            for fgroup in self.engagement.fgroups:
                for finding in fgroup:
                    findings.append(finding)

        else:
            log.debug(f'Validating findings: {requested_finding_uuids}')
            # make sure all UUIDs are valid findings
            validated_finding_uuids = list(self.validate_finding_uuids(requested_finding_uuids))

            self._findings = json.dumps([str(u) for u in validated_finding_uuids], cls=UUIDEncoder)

            for finding in self.engagement.findings:
                if UUID(str(finding.id)) in validated_finding_uuids:
                    findings.append(finding)

        return findings


    @property
    def fgroups(self):
        '''
        Returns a python dictionary in the following format:
        {
            fgroup1.name: [
                finding1,
                finding2
            ],
            fgroup2.name: [
                finding3,
                finding4
            ],
            ...
        }
        '''


        log.debug(f'Called {self.className}.fgroups()')
        fgroups = dict()

        requested_finding_uuids = list(self.finding_uuids)
        validated_finding_uuids = []

        # if no findings are specified, give all of them
        if not requested_finding_uuids:
            for fgroup in self.engagement.fgroups:
                for finding in fgroup:
                    try:
                        fgroups[fgroup.name].append(finding)
                    except KeyError:
                        fgroups[fgroup.name] = [finding]

        else:
            log.debug(f'Validating findings: {requested_finding_uuids}')
            # make sure all UUIDs are valid findings
            validated_finding_uuids = list(self.validate_finding_uuids(requested_finding_uuids))

            self._findings = json.dumps([str(u) for u in validated_finding_uuids], cls=UUIDEncoder)

            for finding in self.engagement.findings:
                if UUID(str(finding.id)) in validated_finding_uuids:
                    findings.append(finding)

        for number, finding in enumerate(findings):
            finding.number = f'F{number+1:03d}'

        return findings
    


    @property
    def pageTemplate(self):

        if self._pageTemplate_object is None:
            try:
                self._pageTemplate_object = PageTemplate.get(id=self.pageTemplateID)
            except PageTemplate.DoesNotExist:
                pass
        
        if self._pageTemplate_object is None:
            self._pageTemplate_object = self.engagement.pageTemplate

        self._pageTemplate_object.report = self
        return self._pageTemplate_object


    def renderComponents(self):

        rendered_components = []

        for order, component in enumerate(self):
            if order == 0:
                log.debug(f"Removing page break from first component {component.name}")
                component.pageBreakBefore = False

            rendered_components.append(component.render({
                'engagement': self.engagement,
                'report': self
            }))

        return rendered_components



    def update(self, componentJSON=None, reportName=None, pageTemplate=None, findings=None):
        '''
        Do everything that the parent function does, and also update findings
        '''

        super().update(componentJSON, reportName, pageTemplate)
        if findings is not None:
            log.debug(f'Updating report findings: {findings}')
            validated_finding_uuids = list(self.validate_finding_uuids(findings))
            self._findings = json.dumps(validated_finding_uuids, cls=UUIDEncoder)
        self.save()



    @property
    def finding_uuids(self):
        '''
        Decodes the JSON in self._findings
        '''

        # make sure we're dealing with valid JSON
        try:
            if len(self._findings):
                finding_uuids = [UUID(f) for f in json.loads(self._findings)]
                log.debug('FINDING UUIDS: ' + str(finding_uuids))
                return finding_uuids
            return []
        except json.JSONDecodeError:
            log.error(f'Invalid JSON: {self._findings}')
            return []


    def validate_finding_uuids(self, finding_uuids):
        '''
        Given an array of finding UUIDs, yield all that are valid
        '''

        valid_finding_uuids = [UUID(str(f.id)) for f in self.engagement.findings]

        log.debug(f'Valid findings: {valid_finding_uuids}')

        for u in finding_uuids:
            u = UUID(str(u))
            if u in valid_finding_uuids:
                yield(u)
            else:
                log.debug(f'{u} not in {valid_finding_uuids}')


    @property
    def parent(self):

        return self.engagement


    @property
    def url(self):
        return f"/engagements/report/{self.id}/edit"



class SavedReport(BaseReport):

    engagementParent = ''

    @property
    def url(self):
        return f"/templates/edit/{self.id}"

    @property
    def parent(self):

        return {
            'url': '/templates',
            'name': 'Report Templates'
        }


class SavedReportImportForm(forms.Form):

    reportTemplate = forms.UUIDField(label='Report Template', widget=SavedReportBootstrapSelect)


def getSavedReports():
    '''
    Retrieves all saved reports and compiles human-friendly descriptions into list
    Used for bootstrap select menu
    '''
    log.debug('getSavedReports() called')
    savedReportList = []
    for report in SavedReport.objects.all():
        savedReportList.append({
            'id': str(report.id),
            'name': f'{report.name} ({report.numComponents:,} components)'
        })

    return sorted(savedReportList, key=lambda x: x['name'])


class reportForm(forms.Form):

    name = forms.CharField(
        label='Title',
        widget=forms.TextInput(attrs={'class': 'name-validation'}),
        max_length=100
    )

    pageTemplateID = forms.UUIDField(
        label='Page Template',
        widget=PageTemplateSelect()
    )


BaseReport.formClass = reportForm
