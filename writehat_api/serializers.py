import re
from pkg_resources import require
from rest_framework import serializers
from writehat.lib.engagement import Engagement
from writehat.lib.findingGroup import BaseFindingGroup
from writehat.lib.pageTemplate import PageTemplate
from writehat.lib.report import Report
from writehat.lib.customer import Customer
from writehat.validation import *

class EngagementSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, max_length=1000, validators=[isValidName])
    class Meta:
        model = Engagement
        fields = ['id','name','createdDate','modifiedDate','customerID','pageTemplateID']

class ReportSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, max_length=1000, validators=[isValidName])
    savedReportID = serializers.UUIDField(required=False, default=None)
    _components = serializers.JSONField(required=False, default=None)

    class Meta:
        model = Report
        fields = ['id','name','createdDate','modifiedDate', 'pageTemplateID', 'savedReportID','engagementParent', '_components']

class CustomerSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, max_length=1000, validators=[isValidName])
    class Meta:
        model = Customer
        fields = '__all__'

class PageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageTemplate
        fields = ['id','name','createdDate','modifiedDate','header','default','footer','logoImageID','backgroundImageID']

class FindingGroupSerializer(serializers.ModelSerializer):
    scoringTypes = ( 
        ("CVSS"), 
        ("DREAD"), 
        ("PROACTIVE")
    )

    scoringType = serializers.ChoiceField(required=True, choices=scoringTypes)
    prefix = serializers.CharField(required=True, max_length=50)
    
    class Meta:
        model = BaseFindingGroup
        fields = ['id','name','createdDate','modifiedDate', 'scoringType', 'prefix']

# Separate serializer for updating a finding group
# This excludes the scoringType field to prevent it from being updated.

class FindingGroupUpdateSerializer(serializers.ModelSerializer):
    prefix = serializers.CharField(required=False, max_length=50)
    class Meta:
        model = BaseFindingGroup
        fields = ['id','name','createdDate','modifiedDate', 'scoringType', 'prefix']

