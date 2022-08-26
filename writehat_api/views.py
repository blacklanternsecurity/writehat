# todo/todo_api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from itertools import chain
from rest_framework import status
from writehat.lib.engagement import Engagement
from writehat.lib.pageTemplate import PageTemplate
from writehat.lib.customer import Customer
from writehat.lib.findingGroup import CVSSFindingGroup, DREADFindingGroup, ProactiveFindingGroup, BaseFindingGroup
from writehat.lib.report import *
from writehat.lib.findingForm import *
from .serializers import EngagementSerializer, CustomerSerializer, ReportSerializer, PageTemplateSerializer, FindingGroupSerializer, FindingGroupUpdateSerializer
from drf_yasg.utils import swagger_auto_schema
from writehat.lib.startup import *

class EngagementListApiView(APIView):
    @swagger_auto_schema(operation_summary="Get all engagements")
    def get(self, request, *args, **kwargs):
        engagements = Engagement.objects.all()
        serializer = EngagementSerializer(engagements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(operation_summary="Create an engagement", request_body=EngagementSerializer)
    def post(self, request, *args, **kwargs):      
        serializer = EngagementSerializer(data=request.data)
        if serializer.is_valid():
            e = Engagement.new(serializer.data)
            # check if the customer exists
            if e.customerID:
                try:
                    Customer.objects.get(id=e.customerID)
                except Customer.DoesNotExist:
                    return Response(
                        {"status": "customer id does not exist"},
                        status=status.HTTP_400_BAD_REQUEST)               
            
            # check if the page template exists
            if e.pageTemplateID:
                try:
                    PageTemplate.objects.get(id=e.pageTemplateID)
                except PageTemplate.DoesNotExist:
                        return Response(
                            {"status": "page template id does not exist"},
                            status=status.HTTP_400_BAD_REQUEST)

            e.save()
            return Response(
                {
                    "status": "object created",
                    "id":e.id
                },
                status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EngagementDetailApiView(APIView):    
    def get_object(self, engagement_id):
        try:
            return Engagement.objects.get(id=engagement_id)
        except Engagement.DoesNotExist:
            return None

    @swagger_auto_schema(operation_summary="Get engagement details")
    def get(self, request, engagement_id, *args, **kwargs):
        engagement = self.get_object(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EngagementSerializer(engagement)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(operation_summary="Update an engagement", request_body=EngagementSerializer)
    def put(self, request, engagement_id, *args, **kwargs):
        engagement = self.get_object(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EngagementSerializer(instance = engagement, data=request.data, partial = True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status":"object updated",
                    "id":engagement_id
                }, 
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(operation_summary="Delete an engagement")
    def delete(self, request, engagement_id, *args, **kwargs):
        engagement = self.get_object(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        engagement.delete()
        return Response(
                {
                    "status":"object deleted",
                    "id":engagement_id
                }, 
                status=status.HTTP_200_OK)

class CustomerListApiView(APIView):
    @swagger_auto_schema(operation_summary="Get all customers")
    def get(self, request, *args, **kwargs):
        customers = Customer.objects.all()
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(operation_summary="Create a customer",request_body=CustomerSerializer)
    def post(self, request, *args, **kwargs):
        serializer = CustomerSerializer(data=request.data)
        
        if serializer.is_valid():
            c = Customer()
            c.updateFromPostData(serializer.data)
            c.save()
            return Response(
                {
                    "status":"object created",
                    "id":c.id
                },
                status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomerDetailApiView(APIView):
    def get_object(self, customer_id):
        try:
            return Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return None

    @swagger_auto_schema(operation_summary="Get customer details")
    def get(self, request, customer_id, *args, **kwargs):
        customer = self.get_object(customer_id)
        if not customer:
            return Response(
                {"status": "object with customer id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CustomerSerializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(operation_summary="Update a customer", request_body=CustomerSerializer)
    def put(self, request, customer_id, *args, **kwargs):
        customer = self.get_object(customer_id)
        if not customer:
            return Response(
                {"status": "object with customer id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CustomerSerializer(instance = customer, data=request.data, partial = True)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status":"object updated",
                    "id":customer_id
                }, 
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(operation_summary="Delete a customer")
    def delete(self, request, customer_id, *args, **kwargs):
        customer = self.get_object(customer_id)
        if not customer:
            return Response(
                {"status": "object with customer id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        customer.delete()
        return Response(
                {
                    "status":"object deleted",
                    "id":customer_id
                }, 
                status=status.HTTP_200_OK)

class ReportListApiView(APIView):

    @swagger_auto_schema(operation_summary="Get all reports for an engagement")
    def get(self, request, engagement_id, *args, **kwargs):

        engagementParent = engagement_id
        if engagementParent:
            try:
                Engagement.objects.get(id=engagementParent)
            except Engagement.DoesNotExist:
                return Response(
                    {"status": "object with engagement id does not exists"},
                    status=status.HTTP_400_BAD_REQUEST)
        
        reports = Report.objects.filter(engagementParent=engagementParent)

        # This will remove the uuid key/value pair from the _components field.
        # I wanted to keep things consistent in the API so that the _components 
        # data returned from this end point is valid for use when creating or
        # updating a report

        serializer = ReportSerializer(reports, many=True)
        for r in serializer.data:
            newComponents = []
            components = json.loads(r["_components"])
            for c in components:
                del c["uuid"]
                newComponents.append(c)
            r["_components"] = newComponents
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(operation_summary="Create a report for an engagement", request_body=ReportSerializer)
    def post(self, request, engagement_id, *args, **kwargs):

        serializer = ReportSerializer(data=request.data)
        
        if serializer.is_valid():
            engagementParent = engagement_id
            if engagementParent:
                try:
                    Engagement.objects.get(id=engagementParent)
                except Engagement.DoesNotExist:
                    return Response(
                        {"status": "object with engagement id does not exists"},
                        status=status.HTTP_400_BAD_REQUEST) 

            reportName = serializer.data['name']
            savedReportID = serializer.data['savedReportID']
            reportComponents = serializer.data['_components']
            pageTemplateID = serializer.data['pageTemplateID']

            if reportComponents:
                validComponents = getComponentList()

                # Check if the components in the request exist
                for r in reportComponents:
                    if r.get('type') not in validComponents:
                        return Response(
                        {"status": f"finding component '{r.get('type')}' does not exist"},
                        status=status.HTTP_400_BAD_REQUEST)
                
                r = Report.new(name=reportName, components=reportComponents, engagementParent=engagementParent)
                r.pageTemplateID = pageTemplateID
                r.save
                return Response(
                {
                    "status": "object created",
                    "id":r.id
                },
                status=status.HTTP_200_OK)
            elif savedReportID:
                try:
                    savedReport = SavedReport.objects.get(id=savedReportID)
                except SavedReport.DoesNotExist:
                    return Response(
                        {"status": "object with saved report id does not exists"},
                        status=status.HTTP_400_BAD_REQUEST) 
        
                r = savedReport.clone(name=savedReport.name, destinationClass=Report)
                r.name = reportName
                r.engagementParent = engagementParent
                r.pageTemplateID = serializer.data["pageTemplateID"]
                r.save()
                return Response(
                {
                    "status": "object created",
                    "id":r.id
                },
                status=status.HTTP_200_OK)
            else:
                 return Response(
                        {"status": "savedReportID or _components field required"},
                        status=status.HTTP_400_BAD_REQUEST) 
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReportDetailApiView(APIView):
    def get_object(self, report_id):
        try:
            return Report.objects.get(id=report_id)
        except Report.DoesNotExist:
            return None

    def checkEngagementExists(self, engagement_id):
        try:
            return Engagement.objects.get(id=engagement_id)
        except Engagement.DoesNotExist:
            return None

    @swagger_auto_schema(operation_summary="Get report details")
    def get(self, request, engagement_id, report_id, *args, **kwargs):

        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        report = self.get_object(report_id)
        if not report:
            return Response(
                {"status": "object with report id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReportSerializer(report)

        # Same as when listing the all reports, we need to remove
        # uuid key/value from _components for consistency

        newReport = serializer.data        
        newComponents = []
        components = json.loads(newReport["_components"])
        for c in components:
            del c["uuid"]
            newComponents.append(c)
        log.debug(newComponents)
        newReport["_components"] = newComponents

        return Response(newReport, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(operation_summary="Update a report for an engagement", request_body=ReportSerializer)
    def put(self, request, engagement_id, report_id, *args, **kwargs):
        
        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report = self.get_object(report_id)
        if not report:
            return Response(
                {"status": "object with report id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReportSerializer(instance = report, data=request.data, partial = True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status":"object updated",
                    "id":report_id
                }, 
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(operation_summary="Delete a report for an engagement")
    def delete(self, request, engagement_id, report_id, *args, **kwargs):
        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        report = self.get_object(report_id)
        if not report:
            return Response(
                {"status": "object with report id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        report.delete()

        return Response(
                {
                    "status":"object deleted",
                    "id":report_id
                }, 
                status=status.HTTP_200_OK)

class FindingGroupsEngagementListApiView(APIView):
    def get_object(self, engagement_id):
        try:
            return Engagement.objects.get(id=engagement_id)
        except Engagement.DoesNotExist:
            return None
    
    @swagger_auto_schema(operation_summary="Get all finding groups for an engagement")
    def get(self, request, engagement_id, *args, **kwargs):
        engagement = self.get_object(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cvssFindingGroups = CVSSFindingGroup.objects.filter(engagementParent=engagement_id)
        dreadFindingGroups = DREADFindingGroup.objects.filter(engagementParent=engagement_id)
        proactiveFindingGroups = ProactiveFindingGroup.objects.filter(engagementParent=engagement_id)
    
        dreadSerializer = FindingGroupSerializer(dreadFindingGroups, many=True)
        proactiveSerializer = FindingGroupSerializer(proactiveFindingGroups, many=True)
        cvssSerializer = FindingGroupSerializer(cvssFindingGroups, many=True)
        
        findingGroups = list(chain(cvssSerializer.data, dreadSerializer.data, proactiveSerializer.data))

        return Response(findingGroups, status=status.HTTP_200_OK)

    @swagger_auto_schema(operation_summary="Create a finding group for an engagement", request_body=FindingGroupSerializer)
    def post(self, request, engagement_id, *args, **kwargs):      
        
        engagement = self.get_object(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = FindingGroupSerializer(data=request.data)

        if serializer.is_valid():
            if serializer.data["scoringType"] == "CVSS":
                fg = CVSSFindingGroup.new(uuid=engagement_id,postData=serializer.data)
            elif serializer.data["scoringType"] == "DREAD":
                fg = DREADFindingGroup.new(uuid=engagement_id,postData=serializer.data)
            elif serializer.data["scoringType"] == "PROACTIVE":
                fg = ProactiveFindingGroup.new(uuid=engagement_id,postData=serializer.data)
            else:
               return Response(
                {"status": "scoring type does not exist"},
                status=status.HTTP_400_BAD_REQUEST
            )

            fg.save()
            return Response(
                {
                    "status": "object created",
                    "id":fg.id
                },
                status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FindingGroupDetailApiView(APIView):
    
    def get_object(self, finding_group_id):
        try:
            return BaseFindingGroup.get_child(id=finding_group_id)
        except:
            return None
    
    def checkEngagementExists(self, engagement_id):
        try:
            return Engagement.objects.get(id=engagement_id)
        except Engagement.DoesNotExist:
            return None

    @swagger_auto_schema(operation_summary="Get finding group details")
    def get(self, request, engagement_id, finding_group_id, *args, **kwargs):

        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        findinggroup = self.get_object(finding_group_id)
        if not findinggroup:
            return Response(
                {"status": "object with finding group id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = FindingGroupSerializer(findinggroup)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(operation_summary="Update a finding group for an engagement", request_body=FindingGroupUpdateSerializer)
    def put(self, request, engagement_id, finding_group_id, *args, **kwargs):
        
        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fgroup = self.get_object(finding_group_id)
        if not fgroup:
            return Response(
                {"status": "object with finding group id does not exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = FindingGroupUpdateSerializer(instance = fgroup, data=request.data, partial = True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status":"object updated",
                    "id":fgroup.id
                }, 
                status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(operation_summary="Delete a finding group for an engagement")
    def delete(self, request, engagement_id, report_id, *args, **kwargs):
        engagement = self.checkEngagementExists(engagement_id)
        if not engagement:
            return Response(
                {"status": "object with engagement id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        report = self.get_object(report_id)
        if not report:
            return Response(
                {"status": "object with finding group id does not exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.delete()

        return Response(
                {
                    "status":"object deleted",
                    "id":report_id
                }, 
                status=status.HTTP_200_OK)

class ReportTemplateListApiView(APIView):
    
    @swagger_auto_schema(operation_summary="Get all report templates")
    def get(self, request, *args, **kwargs):
        savedReports = SavedReport.objects.all()
        serializer = ReportSerializer(savedReports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PageTemplateListApiView(APIView):
    
    @swagger_auto_schema(operation_summary="Get all page templates")
    def get(self, request, *args, **kwargs):
        pageTemplates = PageTemplate.objects.all()
        serializer = PageTemplateSerializer(pageTemplates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)