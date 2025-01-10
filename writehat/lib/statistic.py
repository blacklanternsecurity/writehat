import logging
import json

log = logging.getLogger(__name__)

from writehat.lib.engagement import *
from writehat.lib.findingCategory import *
from writehat.lib.cvss import *
from writehat.lib.dread import *

def severity_statistics(startDate, endDate):
    log.debug('Getting severity statistics')
    labels = ['Informational', 'Low', 'Medium', 'High', 'Critical', 'Total']
    informational, low, medium, high, critical, total = 0,0,0,0,0,0
    cvss_findings = CVSSEngagementFinding.objects.filter(createdDate__range=[startDate, endDate])
    dread_findings = DREADEngagementFinding.objects.filter(createdDate__range=[startDate, endDate])
    proactive_findings = ProactiveEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).count()
    
    for finding in cvss_findings:
        total+=1
        cvss = CVSS(finding.vector)
        if cvss.severity == "Informational":
            informational+=1
        elif cvss.severity == "Low":
            low+=1
        elif cvss.severity == "Medium":
            medium+=1
        elif cvss.severity == "High":
            high+=1
        else:
            critical+=1
    cvss_data = [informational, low, medium, high, critical, total]
    informational, low, medium, high, critical, total = 0,0,0,0,0,0
    for finding in dread_findings:
        total+=1
        dread = DREAD(finding.vector)
        if dread.severity == "Informational":
            informational+=1
        elif dread.severity == "Low":
            low+=1
        elif dread.severity == "Medium":
            medium+=1
        elif dread.severity == "High":
            high+=1
        else:
            critical+=1
    dread_data = [informational, low, medium, high, critical, total]
    
    proactive_data = [0, 0, 0, 0, 0, proactive_findings]
    return labels, cvss_data, dread_data, proactive_data

def category_statistics(startDate, endDate):
    log.debug('Getting category statistics')
    labels, data, category_uuids = [], [], []
    categories = DatabaseFindingCategory.objects.all()
    for category in categories:
        if category.name != "root":
            labels.append(category.name)     
            category_uuids.append(category.id)
    for uuid in category_uuids:
        categoryCount = DREADEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(categoryID=uuid).count()
        categoryCount += CVSSEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(categoryID=uuid).count()
        categoryCount += ProactiveEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(categoryID=uuid).count()
        data.append(categoryCount)
    
    return labels, data

def customer_statistics(startDate, endDate):
    labels, data, engagements = [], [], []
    log.debug('Getting customer statistics')
    customers = Customer.objects.all()
    for customer in customers:
        findingCount=0
        engagements = Engagement.objects.filter(customerID=customer.id)
        for engagement in engagements:
            findingGroups = BaseFindingGroup.objects.filter(engagementParent=engagement.id)
            for findingGroup in findingGroups:
                fc = CVSSEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(findingGroup=findingGroup.id).count()
                fc += DREADEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(findingGroup=findingGroup.id).count()
                fc += ProactiveEngagementFinding.objects.filter(createdDate__range=[startDate, endDate]).filter(findingGroup=findingGroup.id).count()
                findingCount+=fc
    
        # don't append customers to the list which have no vulnerabilities 
        if findingCount != 0:
            labels.append(customer.name)
            data.append(findingCount)
    labels = [x for _, x in sorted(zip(data, labels), reverse=True)]
    data = sorted(data, reverse=True)
    x = labels[:9]
    y = data[:9]
    if sum(data[9:]) != 0:
        x.append("Other")
        y.append(sum(data[9:]))
    labels,data = x,y
    
    return labels, data

def engagement_statistics(startDate, endDate):
    log.debug('Getting engagement statistics (count)')
    data = 0
    data = Engagement.objects.filter(createdDate__range=[startDate, endDate]).count()
    return data

def engagement_name_statistics(startDate, endDate):
    log.debug('Getting engagement statistics (by name)')
    data = []
    engagements = Engagement.objects.filter(createdDate__range=[startDate, endDate])
    for engagement in engagements:
        data.append(engagement.name)
    if not data:
        data.append("No engagements started in the specified time window")
    return data