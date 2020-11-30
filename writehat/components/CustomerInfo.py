from .base import *
from django import forms


class CustomerInfoComponentForm(ComponentForm):

    field_order = [
        'name',
        'custName',
        'custAddress',
        'custCity',
        'custState',
        'custZip',
        'custUrl',
        'contactName',
        'contactTitle',
        'contactPhone',
        'contactEmail',
        'opName',
        'opTitle',
        'opPhone',
        'opEmail',
        'opAddress',
        'opCity',
        'opState',
        'opZip',
        'opUrl',
        'pageBreakBefore',
        'showTitle'
    ]
    
    # Customer Information
    custName = forms.CharField(label='Company Name', required=False)
    custAddress = forms.CharField(label='Customer Address', required=False)
    custCity = forms.CharField(label='Customer City', required=False)
    custState = forms.CharField(label='Customer State', required=False)
    custZip = forms.CharField(label='Customer Zip', required=False)
    custUrl = forms.CharField(label='Customer Website', required=False)
    
    # Customer Contact Information
    contactName = forms.CharField(label='Contact Name', required=False)
    contactTitle = forms.CharField(label='Contact Title', required=False)
    contactPhone = forms.CharField(label='Contact Phone', required=False)
    contactEmail = forms.CharField(label='Contact Email', required=False)

    # Operator Information
    opName = forms.CharField(label='Operator Name', required=False)
    opTitle = forms.CharField(label='Operator Title', required=False)
    opPhone = forms.CharField(label='Operator Phone', required=False)
    opEmail = forms.CharField(label='Operator Email', required=False)
    opAddress = forms.CharField(label='Operator Address', required=False)
    opCity = forms.CharField(label='Operator City', required=False)
    opState = forms.CharField(label='Operator State', required=False)
    opZip = forms.CharField(label='Operator Zip', required=False)
    opUrl = forms.CharField(label='Operator URL', required=False)


class Component(BaseComponent):

    default_name = 'Customer Information'
    htmlTemplate = 'componentTemplates/CustomerInfoComponent.html'
    fieldList = {
        'custName': StringField(templatable=False),
        'custAddress': StringField(templatable=False),
        'custCity': StringField(templatable=False),
        'custState': StringField(templatable=False),
        'custZip': StringField(templatable=False),
        'custUrl': StringField(templatable=False),
        'contactName': StringField(templatable=False),
        'contactTitle': StringField(templatable=False),
        'contactPhone': StringField(templatable=False),
        'contactEmail': StringField(templatable=False),
        'opName': StringField(templatable=False),
        'opTitle': StringField(templatable=False),
        'opPhone': StringField(templatable=False),
        'opEmail': StringField(templatable=False),
        'opAddress': StringField(templatable=True),
        'opCity': StringField(templatable=True),
        'opState': StringField(templatable=True),
        'opZip': StringField(templatable=True),
        'opUrl': StringField(templatable=True),
    }
    formClass = CustomerInfoComponentForm
    iconType = 'fas fa-id-card-alt'
    iconColor = 'var(--cyan)'