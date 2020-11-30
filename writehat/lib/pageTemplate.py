import logging
from django import forms
from django.db import models
from writehat.lib.figure import ImageModel
from writehat.lib.widget import ImageSelect
from writehat.lib.markdown import render_markdown
from writehat.models import WriteHatBaseModel, MarkdownField


log = logging.getLogger(__name__)



class PageTemplate(WriteHatBaseModel):

    # parent report or engagement
    parentResource = models.UUIDField(editable=False, null=True)
    # page background image
    backgroundImageID = models.UUIDField(editable=False, null=True)
    # page background image
    logoImageID = models.UUIDField(editable=False, null=True)
    # report footer
    footer = MarkdownField(max_length=30000, null=True, blank=True)
    # whether it's set as the default config
    default = models.BooleanField(default=False, null=True, blank=True)


    @property
    def logo(self):

        if self.logoImageID:
            try:
                return ImageModel.get(id=self.logoImageID)
            except ImageModel.DoesNotExist:
                pass


    @property
    def background(self):

        if self.backgroundImageID:
            try:
                return ImageModel.get(id=self.backgroundImageID)
            except ImageModel.DoesNotExist:
                pass


    def clone(self, *args, **kwargs):

        clonedPage = super().clone(*args, **kwargs)

        # if default is set, unset it on clone
        if self.default == True:
            clonedPage.default = False
        return clonedPage


    def renderFooter(self):

        if self.footer:
            footer = str(self.footer)
        else:
            footer = ''

        try:
            footer = render_markdown(
                footer,
                context={
                    'engagement': self.report.engagement,
                    'report': self.report
                }
            )
            return footer
        except AttributeError as e:
            return ''



    def updateFromForm(self, form):

        super().updateFromForm(form)

        # if default is set, unset from others
        if form.is_valid():

            if form.cleaned_data['default'] == True:
                for page in PageTemplate.objects.filter(default=True):
                    page.default = False
                    page.save()


    def populateForm(self, *args, **kwargs):

        kwargs['backgroundImageID'] = self.backgroundImageID
        kwargs['logoImageID'] = self.logoImageID
        return super().populateForm(*args, **kwargs)


    @property
    def url(self):
        return f"/pages/edit/{self.id}"

    @property
    def parent(self):

        return {
            'url': '/templates',
            'name': 'Report Templates'
        }





class PageTemplateForm(forms.Form):

    name = forms.CharField(
        label='Name', 
        widget=forms.TextInput(
            attrs={
                'class': 'name-validation'
            }
        ),
        max_length=100,
        required=True
    )

    footer = forms.CharField(
        label='Page Footer',
        widget=forms.Textarea(),
        max_length=30000,
        required=False
    )

    default = forms.BooleanField(
        label='Default Template?',
        required=False
    )

    backgroundImageID = forms.UUIDField(
        label='Background Image',
        widget=ImageSelect,
        required=False
    )

    logoImageID = forms.UUIDField(
        label='Company Logo',
        widget=ImageSelect,
        required=False
    )

    def __init__(self, *args, **kwargs):

        backgroundImageID = kwargs.pop('backgroundImageID', '')
        logoImageID = kwargs.pop('logoImageID', '')
        super().__init__(*args, **kwargs)
        self.fields['backgroundImageID'].widget = ImageSelect(
            imageID=backgroundImageID,
            name='backgroundImageID'
        )
        self.fields['logoImageID'].widget = ImageSelect(
            imageID=logoImageID,
            name='logoImageID'
        )



PageTemplate.formClass = PageTemplateForm