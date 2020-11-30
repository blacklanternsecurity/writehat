from .base import *

class TableComponentForm(ComponentForm):

    text = forms.CharField(label='Content', widget=forms.Textarea, max_length=50000, required=False)
    caption = forms.CharField(label='Caption', required=False)
    field_order = ['name', 'text', 'caption', 'pageBreakBefore', 'showTitle']


class Component(BaseComponent):

    default_name = 'Table'
    htmlTemplate = 'componentTemplates/TableComponent.html'
    fieldList = {
        'text': StringField(markdown=True, templatable=True),
        'caption': StringField(templatable=True)
    }
    formClass = TableComponentForm
    captionType = caption.table
    iconType = 'fas fa-table'
    iconColor = 'var(--green)'