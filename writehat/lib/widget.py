from django.forms import widgets
from writehat.lib.errors import FindingImportError, EngagementFgroupError


class BaseBootstrapSelect(widgets.Input):

    template_name = 'widgets/bootstrapSelect.html'
    input_type = 'text'

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        return context



class FindingGroupSelect(BaseBootstrapSelect):

    def __init__(self, attrs=None, engagementId=None, scoringType=None):

        self.engagementId = engagementId
        self.scoringType = scoringType
        super().__init__()


    def get_context(self, name, value, attrs):

        # we have to import here to prevent a circular reference
        from writehat.lib.findingGroup import BaseFindingGroup
        context = super().get_context(name, value, attrs)
        context['selectRows'] = BaseFindingGroup.FindingsGroupSelect(
            engagementId=self.engagementId,
            scoringType=self.scoringType
        )
        return context



class CategoryBootstrapSelect(BaseBootstrapSelect):

    def get_context(self, name, value, attrs):
        # we have to import here to prevent a circular reference
        from writehat.lib.findingCategory import DatabaseFindingCategory
        context = super().get_context(name, value, attrs)
        context['selectRows'] = DatabaseFindingCategory.getCategoriesFlat()
        context['selectRows'].insert(0, {'id': '', 'name': ''})
        return context


class CategoryBootstrapSelectEngagements(CategoryBootstrapSelect):

    template_name = 'widgets/categoryBootstrapSelectEngagement.html'


class FindingBootstrapSelect(BaseBootstrapSelect):

    def __init__(self, attrs=None, scoringType=None):
        super(FindingBootstrapSelect, self).__init__()
        if scoringType == None:
            raise FindingImportError('FindingBootstrapSelect cannot resolve finding type')

        self.scoringType = scoringType

    def get_context(self, name, value, attrs):
        # we have to import here to prevent a circular reference
        from writehat.lib.finding import getFindingsFlat
        context = super().get_context(name, value, attrs)
        context['selectRows'] = getFindingsFlat(self.scoringType)
        return context


class SavedReportBootstrapSelect(BaseBootstrapSelect):

    def get_context(self, name, value, attrs):
        # we have to import here to prevent a circular reference
        from writehat.lib.report import getSavedReports
        context = super().get_context(name, value, attrs)
        context['selectRows'] = getSavedReports()
        return context


class SelectBase(widgets.Select):
    template_name = 'widgets/select.html'

    def __init__(self,fieldName,attrs={}):
        super().__init__()
        self.fieldName = fieldName
        self.attrs = attrs

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context['fieldName'] = self.fieldName
        return context


class TooltipBase(SelectBase):

    def __init__(self,fieldName,tooltipText,attrs={}):
        super().__init__(fieldName, attrs)
        self.fieldName = fieldName
        self.tooltipText = tooltipText
        self.attrs = attrs

     #   print(attributes['attrs'])

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context['fieldName'] = self.fieldName
        context['tooltipText'] = self.tooltipText
        return context

    template_name = 'widgets/tooltip.html'
    # option_template_name


class customTextarea(widgets.Textarea):
    pass


class ImageSelect(widgets.Input):

    template_name = 'widgets/imageSelect.html'
    input_type = 'text'

    def __init__(self, *args, **kwargs):

        self.imageID = kwargs.pop('imageID', '')
        self.name = kwargs.pop('name', '')
        super().__init__(*args, **kwargs)

    def get_context(self, *args, **kwargs):

        context = super().get_context(*args, **kwargs)
        context['imageID'] = self.imageID
        context['name'] = self.name
        return context



class PageTemplateSelect(BaseBootstrapSelect):

    def get_context(self, *args, **kwargs):
        # we have to import here to prevent a circular reference
        from writehat.lib.pageTemplate import PageTemplate
        context = super().get_context(*args, **kwargs)
        context['selectRows'] = PageTemplate.getBootstrapSelect()
        context['selectRows'].insert(0, {'id': '', 'name': ''})
        return context



class CustomerSelect(BaseBootstrapSelect):

    template_name = 'widgets/customerSelect.html'

    def get_context(self, *args, **kwargs):
        # we have to import here to prevent a circular reference
        from writehat.lib.customer import Customer
        context = super().get_context(*args, **kwargs)
        context['selectRows'] = Customer.getBootstrapSelect()
        context['selectRows'].insert(0, {'id': '', 'name': ''})
        return context
