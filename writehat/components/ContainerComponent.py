from .base import *

class ContainerComponentForm(ComponentForm):

    name = forms.CharField(label='Title', required=False)
    pageBreakBefore = forms.BooleanField(label='Start On New Page?', required=False)
    # No 'showTitle' on Containers; title is always displayed

class Component(BaseComponent):

    default_name = 'Container'
    formClass = ContainerComponentForm
    htmlTemplate = 'componentTemplates/ContainerComponent.html'
    isContainer = True
    iconType = 'far fa-square'
    iconColor = '#fff'
