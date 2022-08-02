from django.conf.urls import url
from django.urls import path, include, re_path
from rest_framework.documentation import include_docs_urls
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from .views import (
    EngagementListApiView,
    EngagementDetailApiView,
    CustomerListApiView,
    CustomerDetailApiView,
    FindingGroupDetailApiView,
    ReportListApiView,
    ReportDetailApiView,
    ReportTemplateListApiView,
    PageTemplateListApiView,
    FindingGroupsEngagementListApiView
)

schema_view = get_schema_view(
   openapi.Info(
      title="WriteHat API",
      default_version='v0.1',
      description="WriteHat reporting tool API. Please note that this is a work in progress and that some functionality is missing. Please see the github readme to see what functionality the API has.",
      author="thejohnbrown"
   ),
   public=True,
   permission_classes=[permissions.AllowAny],
)

urlpatterns = [

    # Documentation
    
    url('docs', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),

    # Engagement APIs
    
    path('engagements', EngagementListApiView.as_view()),
    path('engagements/<str:engagement_id>', EngagementDetailApiView.as_view()),

    # Finding Group APIs

    path('engagements/<str:engagement_id>/findinggroups', FindingGroupsEngagementListApiView.as_view()),
    path('engagements/<str:engagement_id>/findinggroups/<str:finding_group_id>', FindingGroupDetailApiView.as_view()),
    
    # Report APIs 

    path('engagements/<str:engagement_id>/reports', ReportListApiView.as_view()),
    path('engagements/<str:engagement_id>/reports/<str:report_id>', ReportDetailApiView.as_view()),

    # Customer APIs

    path('customers', CustomerListApiView.as_view()),
    path('customers/<str:customer_id>', CustomerDetailApiView.as_view()),

    # Templates API

    path('templates/reports', ReportTemplateListApiView.as_view()),
    path('templates/pages', PageTemplateListApiView.as_view()),
]