import logging
from .base import *
from uuid import UUID
from writehat.lib.widget import FindingGroupSelect

log = logging.getLogger(__name__)


class FindingsListForm(ComponentForm):

    findingGroup = forms.UUIDField(label='Finding Group', required=False)
    showFindingNumbers = forms.BooleanField(label='Show Finding Numbers', required=False)
    showVector = forms.BooleanField(label='Show Scoring Vector', required=False)
    field_order = ['name', 'findingGroup', 'pageBreakBefore', 'showTitle', 'showFindingNumbers', 'showVector']



class Component(BaseComponent):

    default_name = 'Findings'
    htmlTemplate = 'componentTemplates/FindingsList.html'
    iconType = 'fas fa-search-plus'
    iconColor = 'var(--cvss-color)'
    formClass = FindingsListForm
    fieldList = {
        'findingGroup': UUIDField(),
        'showFindingNumbers': BoolField(templatable=True, default=True),
        'showVector': BoolField(templatable=True, default=False)
    }


    def __init__(self, *args, **kwargs):

        self._fgroup_object = None
        super().__init__(*args, **kwargs)

        # populate finding groups in the form
        self.form.fields['findingGroup'].widget = FindingGroupSelect(
            attrs={'required': 'true'},
            engagementId=self.engagementParent
        )


    def preprocess(self, context):

        context['findingGroup'] = self.getFindingGroup

        return super().preprocess(context)



    @property
    def getFindingGroup(self):

        from writehat.lib.errors import EngagementFgroupError
        from writehat.lib.findingGroup import BaseFindingGroup
        if self._fgroup_object is None:
            try:
                self._fgroup_object = BaseFindingGroup.get_child(id=self.findingGroup)
            except EngagementFgroupError:
                pass

        return self._fgroup_object


    @property
    def figures(self):

        figures = []

        try:

            fgroupID = None
            try:
                fgroupID = self.getFindingGroup.id
            except AttributeError:
                try:
                    fgroupID = UUID(str(self.findingGroup))
                except ValueError:
                    pass

            for finding in self.report.findings:
                findingFgroupID = None
                try:
                    findingFgroupID = UUID(str(finding.findingGroup))
                except (AttributeError, ValueError):
                    pass
                if findingFgroupID == fgroupID:
                    for figure in finding.figures:
                        figures.append(figure)

        except AttributeError as e:
            # this report doesn't have findings
            pass

        return figures


    @property
    def todoItems(self):

        out = []

        try:

            fgroupID = None
            try:
                fgroupID = self.getFindingGroup.id
            except AttributeError:
                try:
                    fgroupID = UUID(str(self.findingGroup))
                except ValueError:
                    pass

            for finding in self.report.findings:
                findingFgroupID = None
                try:
                    findingFgroupID = UUID(str(finding.findingGroup))
                except (AttributeError, ValueError):
                    pass
                if findingFgroupID == fgroupID:
                    for item in finding.todoItems:
                        out.append(f"{finding.name}: {item}")

        except AttributeError as e:
            # this report doesn't have findings
            pass

        return out


    @property
    def iconColorDynamic(self):
    
        try:
            if self.getFindingGroup.scoringType == 'DREAD':
                return 'var(--dread-color)'
            elif self.getFindingGroup.scoringType == 'PROACTIVE':
                return 'var(--proactive-color)'
        except AttributeError:
            pass
        return 'var(--cvss-color)'
