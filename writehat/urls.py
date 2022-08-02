from writehat import views
from writehat.lib.finding import *
#WRITEHAT URL Configuration

from django.urls import include, path
from django.contrib import admin
from django.conf.urls import url
from django.contrib.auth.views import LoginView,LogoutView
from writehat_api import urls as writehat_urls

uuid = r'(?P<uuid>[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12})'
fgroup = r'(?P<fgroup>[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12})'
gtype = r'(?P<gtype>[a-z]{4,9})'

urlpatterns = [

    # API
    path('api/', include(writehat_urls)),

    # Authentication URLS
    path('login', LoginView.as_view(), name='login'),
    path('logout', LogoutView.as_view(), name='logout'),

    # Root level URLS
    path('admin', admin.site.urls),
    path('home', views.home, name='home'),
    path('', views.index),

    # Validation
    path('validation/whitelists', views.validationWhitelists),
    path('validation/cvss', views.validationCVSS),
    path('validation/dread', views.validationDREAD),

    # Images urls
    path('images/upload', views.imageUpload),
    url(rf'^images/{uuid}$', views.imageLoad),
    url(rf'^images/meta/{uuid}$', views.imageMeta),
    url(rf'^images/finding/{uuid}/edit$', views.findingFigureEdit),


    #url(rf'^images/test/{uuid}$', views.imageTest),


    # findings urls
    path('findings', views.findingsList),
    path('findings/cvss/new', views.findingCvssNew),
    path('findings/dread/new', views.findingDreadNew),
    path('findings/proactive/new', views.findingProactiveNew),
    path('findings/create', views.findingCreate),
    path('findings/category/add', views.findingCategoryAdd),
    url(rf'^findings/category/edit/{uuid}$', views.findingCategoryEdit),
    url(rf'^findings/category/delete/{uuid}$', views.findingCategoryDelete),
    url(rf'^findings/edit/{uuid}$', views.findingEdit),
    url(rf'^findings/delete/{uuid}$', views.findingDelete),
    url(rf'^findings/import/{uuid}', views.engagementFindingExport),

    # report template urls
    path('templates', views.templatesList),
    path('templates/new', views.templateNew),
    path('templates/create', views.templateCreate),
    url(rf'^templates/edit/{uuid}$', views.templateEdit),
    url(rf'^templates/delete/{uuid}$', views.templateDelete),
    url(rf'^templates/update/{uuid}$', views.templateUpdate),
    url(rf'^templates/clone/{uuid}$', views.reportClone),


    # page template urls
    path('pages/new', views.pageNew),
    path('pages/create', views.pageCreate),
    url(rf'^pages/edit/{uuid}$', views.pageEdit),
    url(rf'^pages/delete/{uuid}$', views.pageDelete),
    url(rf'^pages/update/{uuid}$', views.pageUpdate),
    url(rf'^pages/clone/{uuid}$', views.pageClone),


    # revision urls
    path('revisions/save', views.revisionSave),
    path('revisions/load', views.revisionLoad),
    path('revisions/compare', views.revisionCompare),
    url(rf'^revisions/list/{uuid}$', views.revisionsList),

    url(rf'^revisions/timestamp/{uuid}$', views.timestamp),

    # engagement urls
    path('engagements', views.engagementsList),
    path('engagements/new', views.engagementNew),
    path('engagements/create', views.engagementCreate),
    url(rf'^engagements/edit/{uuid}$', views.engagementEdit),
    url(rf'^engagements/clone/{uuid}$', views.engagementClone),
    url(rf'^engagements/delete/{uuid}$', views.engagementDelete),


    # engagement fgroup urls
    url(rf'^engagements/{uuid}/fgroup/{gtype}/create$', views.engagementFgroupCreate),
    url(rf'^engagements/{uuid}/fgroup/list$', views.engagementFgroupList),
    url(rf'^engagements/fgroup/delete/{uuid}$', views.engagementFgroupDelete),
    url(rf'^engagements/fgroup/edit/{uuid}$', views.engagementFgroupEdit),
    url(rf'^engagements/fgroup/status/{uuid}$', views.engagementFgroupStatus),


    # engagementFinding urls
    url(rf'^engagements/fgroup/{uuid}/finding/new$', views.engagementFindingNew),
    url(rf'^engagements/fgroup/{uuid}/finding/create$', views.engagementFindingCreate),
    url(rf'^engagements/fgroup/{uuid}/finding/list$', views.engagementFindingList),

    url(rf'^engagements/{uuid}/excel$', views.engagementFindingExcel),
    
    url(rf'^engagements/fgroup/finding/edit/{uuid}$', views.engagementFindingEdit),
    url(rf'^engagements/fgroup/finding/delete/{uuid}$', views.engagementFindingDelete),
    url(rf'^engagements/fgroup/{fgroup}/finding/import/{uuid}$', views.engagementFindingImport),

    url(rf'^engagements/{uuid}/report/new$', views.reportNew),
    url(rf'^engagements/{uuid}/report/create$', views.reportCreate),
    url(rf'^engagements/{uuid}/report/list$', views.reportsList),


    # customer urls
    path('customers', views.customersList),
    path('customers/create', views.customerCreate),
    url(rf'^customers/{uuid}/edit$', views.customerEdit),
    url(rf'^customers/{uuid}/delete$', views.customerDelete),


    # Component URLS
    url(rf'^components/{uuid}/edit$', views.componentEdit),
    url(rf'^components/{uuid}/update$', views.componentSave),
    url(rf'^components/{uuid}/status/update$', views.componentStatusUpdate),

    # Report urls
    path('engagements/report', views.reportsHome),
    path('engagements/report/new', views.reportNew),
    path('engagements/report/create', views.reportCreate),
    path('engagements/report/findings', views.getReportFindings),
    url(rf'^engagements/report/{uuid}/components$', views.getReportComponents),
    url(rf'^engagements/report/{uuid}/edit$', views.reportEdit),
    url(rf'^engagements/report/{uuid}/status$', views.componentReviewStatus),
    url(rf'^engagements/report/{uuid}/generate$', views.reportGenerate),
    url(rf'^engagements/report/{uuid}/generatePdf$', views.reportGeneratePdf),
    url(rf'^engagements/report/{uuid}/update$', views.reportUpdate),
    url(rf'^engagements/report/{uuid}/delete$', views.reportDelete),
    url(rf'^engagements/report/{uuid}/saveToTemplate$', views.reportSaveToTemplate),
    url(rf'^engagements/report/{uuid}/createFromTemplate$', views.reportCreateFromTemplate),

    # Template loading helper URLs
    url(r'^panes/(?P<pane>[a-zA-Z]{1,30})$', views.renderPane),
    url(r'^modals/(?P<modal>[a-zA-Z]{1,30})$', views.renderModal),


# Admin URLS
    path('admintools', views.admintoolsHome),
    path('admintools/backup', views.admintoolsBackup),
    path('admintools/restore', views.admintoolsRestore),

]



