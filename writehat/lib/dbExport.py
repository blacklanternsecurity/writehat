
import zipfile
import subprocess
from io import BytesIO
from django.conf import settings
from django.core import serializers
from writehat.lib.figure import ImageModel
from writehat.lib.revision import Revision
from writehat.lib.customer import Customer
from writehat.lib.engagement import Engagement
from writehat.lib.pageTemplate import PageTemplate
from writehat.lib.report import Report, SavedReport
from writehat.lib.findingCategory import DatabaseFindingCategory
from writehat.lib.findingGroup import CVSSFindingGroup, DREADFindingGroup, BaseFindingGroup, ProactiveFindingGroup
from writehat.lib.engagementFinding import CVSSEngagementFinding, DREADEngagementFinding, ProactiveEngagementFinding
from writehat.lib.finding import CVSSDatabaseFinding,DREADFinding, DREADDatabaseFinding, ProactiveDatabaseFinding, ProactiveFinding


MONGO_CONFIG = settings.MONGO_CONFIG

def generate_zip(files):
    mem_zip = BytesIO()

    with zipfile.ZipFile(mem_zip, mode="w",compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.writestr(f[0], f[1])

    return mem_zip.getvalue()

def dbExport():


    files = []


    # pull mongo data
    result = subprocess.run(['mongoexport',
                             '--collection=report_components',
                             f'''--db={MONGO_CONFIG['database']}''',
                             '--host="mongo:27017"',
                             f'''--username="{MONGO_CONFIG['user']}"''',
                             f'''--password="{MONGO_CONFIG['password']}"''',
                             '--authenticationDatabase',
                              'admin', 
                              '--forceTableScan'], stdout=subprocess.PIPE)
 
    files.append(('components.json',result.stdout))


    # pull all ORM data
    files.append(('CVSSEngagementFinding.json',serializers.serialize('json', CVSSEngagementFinding.objects.all())))
    files.append(('DREADEngagementFinding.json',serializers.serialize('json', DREADEngagementFinding.objects.all())))
    files.append(('ProactiveEngagementFinding.json',serializers.serialize('json', ProactiveEngagementFinding.objects.all())))
    files.append(('DREADFindingGroup.json',serializers.serialize('json', DREADFindingGroup.objects.all())))
    files.append(('CVSSFindingGroup.json',serializers.serialize('json', CVSSFindingGroup.objects.all())))
    files.append(('ProactiveFindingGroup.json',serializers.serialize('json', ProactiveFindingGroup.objects.all())))
    files.append(('BaseFindingGroup.json',serializers.serialize('json', BaseFindingGroup.objects.all())))
    files.append(('Engagement.json',serializers.serialize('json', Engagement.objects.all())))
    files.append(('Report.json',serializers.serialize('json', Report.objects.all())))
    files.append(('SavedReport.json',serializers.serialize('json', SavedReport.objects.all())))
    files.append(('PageTemplate.json',serializers.serialize('json', PageTemplate.objects.all())))
    files.append(('CVSSDatabaseFinding.json',serializers.serialize('json', CVSSDatabaseFinding.objects.all())))
    files.append(('DREADDatabaseFinding.json',serializers.serialize('json', DREADDatabaseFinding.objects.all())))
    files.append(('ProactiveDatabaseFinding.json',serializers.serialize('json', ProactiveDatabaseFinding.objects.all())))
    files.append(('DatabaseFindingCategory.json',serializers.serialize('json', DatabaseFindingCategory.objects.all())))
    files.append(('DREADFinding.json',serializers.serialize('json', DREADFinding.objects.all())))
    files.append(('ProactiveFinding.json',serializers.serialize('json', ProactiveFinding.objects.all())))
    files.append(('Revision.json',serializers.serialize('json', Revision.objects.all())))
    files.append(('Customer.json',serializers.serialize('json', Customer.objects.all())))
    files.append(('ImageModel.json',serializers.serialize('json', ImageModel.objects.all(),fields=["name","createdDate","modifiedDate","caption","size","findingParent","contentType","order"])))


    # pull images
    for image in ImageModel.objects.all():
        files.append((f'images/{image.id}.png',image.data))


    # create the zip file
    zipfile = generate_zip(files)

  
    return zipfile
