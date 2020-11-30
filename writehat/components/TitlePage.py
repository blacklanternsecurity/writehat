from .base import *
from django import forms
from datetime import datetime

current_year = datetime.now().year
years = range(current_year-5, current_year+5)


class TitlePageForm(ComponentForm):
   # ComponentID = forms.UUIDField(label='Report ID')
    company = forms.CharField(label='Company Name', required=False)
    assessmentType = forms.CharField(label='Report Title', required=False)
    reportDate = forms.DateTimeField(widget=forms.SelectDateWidget(years=years), label='Report Date', required=False)


class Component(BaseComponent):

    default_name = 'Title Page'
    formClass = TitlePageForm
    fieldList = {
        'company': StringField(),
        'assessmentType': StringField(templatable=True),
        'reportDate': StringField()
    }
    htmlTemplate = 'componentTemplates/TitlePage.html'
    includeInToc = False
    iconType = 'fas fa-file-alt'
    iconColor = '#fce803' # yellow / gold
