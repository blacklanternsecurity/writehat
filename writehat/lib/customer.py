import logging
from django import forms
from django.db import models
from django.forms import ModelForm, TextInput
from writehat.models import WriteHatBaseModel


log = logging.getLogger(__name__)


class Customer(WriteHatBaseModel):

    name        = models.CharField(verbose_name="Company Name", max_length=1000, null=True, blank=True)
    shortName   = models.CharField(verbose_name="Company Short Name", max_length=1000, null=True, blank=True)
    domain      = models.CharField(verbose_name="Internal Domain", max_length=100, null=True, blank=True)
    website     = models.CharField(verbose_name="Primary Website", max_length=100, null=True, blank=True)
    address     = models.CharField(verbose_name="Company Address", max_length=1000, null=True, blank=True)
    POC         = models.CharField(verbose_name="Company Point of Contact", max_length=1000, null=True, blank=True)
    email       = models.EmailField(verbose_name="Contact Email Address", blank=True)
    phone       = models.CharField(verbose_name="Contact Phone Number", max_length=100, null=True, blank=True)
    # parent report, engagement, etc.
    parentResource = models.UUIDField(editable=False, null=True)


    def __str__(self):

        if self.shortName:
            return self.shortName
        else:
            return self.name


    @property
    def url(self):

        return f"/customers/{self.id}/edit"


    @property
    def parent(self):

        return {
            'url': '/customers',
            'name': 'Customers'
        }
    


class CustomerForm(ModelForm):

    auto_id_str = 'customerForm_%s'

    class Meta:
        model = Customer
        fields = '__all__'
        widgets = {
            'name': TextInput(attrs={'class': 'name-validation', 'placeholder': 'Arasaka Corporation'}),
            'shortName': TextInput(attrs={'class': 'name-validation', 'placeholder': 'Arasaka'}),
            'domain': TextInput(attrs={'placeholder': 'ARASAKA.LOCAL'}),
            'website': TextInput(attrs={'placeholder': 'https://www.arasaka.fnet'}),
            'address': TextInput(attrs={'placeholder': '123 Corpo Plaza, Night City CA 90077'}),
            'POC': TextInput(attrs={'placeholder': 'Sasai Arasaka'}),
            'email': TextInput(attrs={'placeholder': 'sasai@arasaka.fnet'}),
            'phone': TextInput(attrs={'placeholder': '777-777-7777'}),
        }


Customer.formClass = CustomerForm