import logging
from .base import *
from uuid import UUID
from writehat.lib.widget import FindingGroupSelect

log = logging.getLogger(__name__)


class FindingsListForm(ComponentForm):

    findingGroup = forms.UUIDField(label='Finding Group', required=False)
    showFindingNumbers = forms.BooleanField(label='Show Finding Numbers', required=False)
    field_order = ['name', 'findingGroup', 'pageBreakBefore', 'showTitle', 'showFindingNumbers']



class Component(BaseComponent):

    default_name = 'Findings'
    htmlTemplate = 'componentTemplates/FindingsList.html'
    iconType = 'fas fa-search-plus'
    iconColor = 'var(--cvss-color)'
    formClass = FindingsListForm
    fieldList = {
        'findingGroup': UUIDField(),
        'showFindingNumbers': BoolField(templatable=True, default=True)
    }


    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        # populate finding groups in the form
        self.form.fields['findingGroup'].widget = FindingGroupSelect(
            attrs={'required': 'true'},
            engagementId=self.engagementParent
        )


    @property
    def figures(self):

        figures = []

        try:

            fgroupID = None
            try:
                fgroupID = self.findingGroup.id
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
    def iconColorDynamic(self):
    
        try:
            if self.findingGroup.scoringType == 'DREAD':
                return 'var(--dread-color)'
            elif self.findingGroup.scoringType == 'PROACTIVE':
                return 'var(--proactive-color)'
        except AttributeError:
            pass
        return 'var(--cvss-color)'