from .base import *

class Component(BaseComponent):

    default_name = 'Table of Tables'
    htmlTemplate = 'componentTemplates/TableOfTables.html'
    iconType = 'fas fa-list'
    iconColor = 'var(--green)'


    def preprocess(self, context):

        tot_components = []
        tot_components = self.buildTot(context['report'].components)
        context['tot_components'] = tot_components
        return context


    @classmethod
    def buildTot(cls, components):
        '''
        Build a list of components
        '''
        tot_components = []
        for c in components:

            try:
                _caption = c.caption
            except AttributeError:
                _caption = ''

            if c.captionType == caption.table:
                component = { 
                    "caption": _caption,
                    "id": c._id
                }
                tot_components.append(component)

            if c.children:
                tot_components += cls.buildTot(c.children)

        return tot_components
