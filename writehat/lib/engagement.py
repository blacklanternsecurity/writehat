from django.db import models
from writehat.components.base import *
from writehat.lib.findingGroup import *
from writehat.lib.customer import Customer
from django.forms import ModelForm, TextInput
from writehat.models import WriteHatBaseModel
from writehat.lib.pageTemplate import PageTemplate
from django.utils.translation import gettext_lazy as _
from writehat.lib.widget import PageTemplateSelect, CustomerSelect


class Engagement(WriteHatBaseModel):

    companyName = models.CharField(verbose_name="Company Name", max_length=1000, null=True, blank=True)
    companyShortName = models.CharField(verbose_name="Company Short Name", max_length=1000, null=True, blank=True)
    companyAddress = models.CharField(verbose_name="Company Address", max_length=1000, null=True, blank=True)
    companyPOC = models.CharField(verbose_name="Company Point of Contact", max_length=1000, null=True, blank=True)
    companyEmail = models.EmailField(verbose_name="Contact Email Address", blank=True)
    companyPhone = models.CharField(verbose_name="Contact Phone Number", max_length=100, null=True, blank=True)
    customerID = models.UUIDField(verbose_name="Customer", null=True, blank=True)
    pageTemplateID = models.UUIDField(verbose_name="Page Template", null=True, blank=True)


    @classmethod
    def new(cls, postData):
        
        engagement = cls()
        form = EngagementForm(postData)
        engagement.updateFromForm(form)
        engagement.clean_fields()
        return engagement


    def __init__(self, *args, **kwargs):

        # holds / caches instantiated FindingGroup objects
        self._fgroup_objects = None

        # holds / caches instantiated Report objects
        self._report_objects = None

        # holds / caches instantiated page template object
        self._pageTemplate_object = None

        super().__init__(*args, **kwargs)
    

    @property
    def fgroups(self):

        if self._fgroup_objects is None:
            self._fgroup_objects = list(BaseFindingGroup.filter_children(engagementParent=self.id))
            self._fgroup_objects.sort(key=lambda x: x.name)

            for fgroup in self._fgroup_objects:
                fgroup._engagement = self

        return self._fgroup_objects


    @property
    def totalFindings(self):
        totalFindingCount = 0
        fgroups = self.fgroups
        for group in fgroups:
            for finding in group.findings:
                totalFindingCount += 1

        return totalFindingCount


    @property
    def findings(self):

        findings = []

        for fgroup in self.fgroups:
            for finding in fgroup:
                findings.append(finding)

        return findings

    
    @property
    def pageTemplate(self):

        if self._pageTemplate_object is None:
            try:
                self._pageTemplate_object = PageTemplate.get(id=self.pageTemplateID)
            except PageTemplate.DoesNotExist:
                try:
                    self._pageTemplate_object = PageTemplate.objects.filter(default=True)[0]
                except IndexError:
                    self._pageTemplate_object = PageTemplate.new()
        return self._pageTemplate_object


    def delete(self):
        log.debug(f"{self.className}.delete() cascading reports delete sequence intiated for engagement UUID: {self.id}")
        for report in self.reports():
            log.debug(f"{report.className}.delete() deleting fgroup with UUID: {report.id}")
            report.delete()



        log.debug(f"{self.className}.delete() cascading findings delete sequence intiated for engagement UUID: {self.id}")
        for fgroup in self.fgroups:
            log.debug(f"{fgroup.className}.delete() deleting fgroup with UUID: {fgroup.id}")
            fgroup.delete()


        log.debug(f"{self.className}.deleting engagement with UUID: {self.id}")
        super().delete()


    @property
    def customer(self):

        customer = None
        if self.customerID:
            try:
                customer = Customer.get(id=self.customerID)
            except Customer.DoesNotExist:
                pass

        return customer


    def reports(self):
        if self._report_objects is None:
            from writehat.lib.report import Report
            self._report_objects = list(Report.objects.filter(engagementParent=self.id).order_by('-modifiedDate'))
            for report in self._report_objects:
                report._engagement_object = self

        return self._report_objects

    @property
    def url(self):
        return f"/engagements/edit/{self.id}"


    @property
    def parent(self):

        return {
            'url': '/engagements',
            'name': 'Engagements'
        }
    


class EngagementForm(ModelForm):
    class Meta:
        model = Engagement
        fields = ['name', 'customerID', 'pageTemplateID']
        widgets = {
            'name': TextInput(attrs={'required': 'true'}),
            'customerID': CustomerSelect,
            'pageTemplateID': PageTemplateSelect,
        }
        labels = {
            'name': _('Engagement Name'),
            'pageTemplateID': _('Page Template'),
        }




Engagement.formClass = EngagementForm
