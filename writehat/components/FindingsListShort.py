import logging
from .base import *
from .FindingsList import FindingsListForm, Component as FindingsListComponent

log = logging.getLogger(__name__)


class Component(FindingsListComponent):

    default_name = 'Findings (Abridged)'
    htmlTemplate = 'componentTemplates/FindingsListShort.html'
    iconType = 'fas fa-search'
    formClass = FindingsListForm
    scoringType = None

    fieldList = {
        'findingGroup': UUIDField(),
        'showFindingNumbers': BoolField(templatable=True, default=False)
    }