import logging
from .base import *

log = logging.getLogger(__name__)

class Component(BaseComponent):

    default_name = 'CVSS Risk Diagram'
    htmlTemplate = 'componentTemplates/CVSSRiskDiagram.html'
    iconType = 'fas fa-border-all'
    iconColor = 'var(--red)'

    @property
    def figures(self):
        '''
        figure ID is just the ID of the component, in case some
        psycopath decides to put two CVSS diagrams in the same report
        '''

        from writehat.lib.figure import ImageModel
        figure = ImageModel(caption=self.default_name)
        figure.id = self.id
        return [figure]