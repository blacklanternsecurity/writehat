from django.conf.urls import url
from django.urls import path, include, re_path
from rest_framework.documentation import include_docs_urls
from rest_framework import permissions
from rest_framework_nested import routers
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from .views import (
    EngagementViewSet,
    CustomerViewSet,
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

router = routers.SimpleRouter()
router.register("engagements", EngagementViewSet)
router.register("customers", CustomerViewSet)

customerRouter = routers.NestedSimpleRouter(router, r'customers', lookup='customer')
customerRouter.register(r'engagements', EngagementViewSet, basename='customer-engagements')

urlpatterns = [

    # Documentation

    url('docs', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),

    # Viewset URLs

    path(r'', include(router.urls)),
    path(r'', include(customerRouter.urls)),

    # Finding Group APIs

    path('engagements/<str:engagement_id>/findinggroups', FindingGroupsEngagementListApiView.as_view()),
    path('engagements/<str:engagement_id>/findinggroups/<str:finding_group_id>', FindingGroupDetailApiView.as_view()),
    
    # Report APIs 

    path('engagements/<str:engagement_id>/reports', ReportListApiView.as_view()),
    path('engagements/<str:engagement_id>/reports/<str:report_id>', ReportDetailApiView.as_view()),

    # Templates API

    path('templates/reports', ReportTemplateListApiView.as_view()),
    path('templates/pages', PageTemplateListApiView.as_view()),
]
