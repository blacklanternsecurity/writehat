import logging
from .base import *

log = logging.getLogger(__name__)

class Component(BaseComponent):

    default_name = 'Summary of Findings Status'
    htmlTemplate = 'componentTemplates/FindingsStatusList.html'
    iconType = 'fas fa-th-list'
    iconColor = 'var(--orange)'