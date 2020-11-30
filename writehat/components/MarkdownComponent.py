import logging
from .base import *

log = logging.getLogger(__name__)


class MarkdownComponentForm(ComponentForm):

    text = forms.CharField(label='Component Text', widget=forms.Textarea, max_length=50000, required=False)
    field_order = ['name', 'text', 'pageBreakBefore', 'showTitle']


class Component(BaseComponent):

    default_name = 'Markdown'
    formClass = MarkdownComponentForm
    fieldList = {
        'text': StringField(markdown=True, templatable=True),
    }
    htmlTemplate = 'componentTemplates/MarkdownComponent.html'
    iconType = 'fas fa-stream'
    iconColor = 'var(--blue)'