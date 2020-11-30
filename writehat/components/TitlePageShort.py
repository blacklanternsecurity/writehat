from .base import *
from datetime import datetime
from .TitlePage import Component as TitlePageComponent

current_year = datetime.now().year
years = range(current_year-5, current_year+5)


class Component(TitlePageComponent):

    default_name = 'Title Page (Abridged)'
    htmlTemplate = 'componentTemplates/TitlePageShort.html'
    iconType = 'fas fa-file'
