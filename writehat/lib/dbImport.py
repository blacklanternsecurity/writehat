import os
import logging
import pymongo
import subprocess
from django.conf import settings
from writehat.lib.errors import *
from django.core import serializers
from zipfile import ZipFile, BadZipfile

from writehat.validation import validJSON
from writehat.lib.figure import ImageModel
from writehat.lib.revision import Revision
from writehat.lib.engagement import Engagement
from writehat.lib.customer import Customer
from writehat.lib.pageTemplate import PageTemplate
from writehat.lib.report import Report, SavedReport
from writehat.lib.findingCategory import DatabaseFindingCategory
from writehat.lib.findingGroup import CVSSFindingGroup, DREADFindingGroup, BaseFindingGroup, ProactiveFindingGroup
from writehat.lib.engagementFinding import CVSSEngagementFinding, DREADEngagementFinding, ProactiveEngagementFinding
from writehat.lib.finding import CVSSDatabaseFinding,DREADFinding,DREADDatabaseFinding, ProactiveDatabaseFinding, ProactiveFinding

MONGO_CONFIG = settings.MONGO_CONFIG
log = logging.getLogger(__name__)


# handle the uploading of a backupfile
def dbImport(fileobject):
    

    log.debug("dbImport called")

    # first, check the extension
    extension = fileobject.name.split('.')[-1]
    if extension != 'zip':
        resultCode = 2
        resultText = "Invalid file extension"
        return resultText,resultCode
    


    try:
        zip_file = ZipFile(fileobject.file)
    except BadZipfile:
        resultCode = 2
        resultText = "File is not a zip file!"
        return resultText,resultCode

    log.debug("dbImport valid .zip file detected")
    # Ensure exactly the right filenames are in the file
    expectedFiles = ['components.json',
    'CVSSEngagementFinding.json',
    'DREADEngagementFinding.json',
    'ProactiveEngagementFinding.json',
    'DREADFindingGroup.json',
    'CVSSFindingGroup.json',
    'ProactiveFindingGroup.json',
    'BaseFindingGroup.json',
    'Engagement.json',
    'Report.json',
    'SavedReport.json',
    'PageTemplate.json',
    'CVSSDatabaseFinding.json',
    'DREADDatabaseFinding.json',
    'ProactiveDatabaseFinding.json',
    'DatabaseFindingCategory.json',
    'DREADFinding.json',
    'ProactiveFinding.json',
    'Revision.json',
    'Customer.json',
    'ImageModel.json']

    zipFileSet = []
    for filename in zip_file.namelist():
        if filename.endswith('.json'):
            zipFileSet.append(filename)

    if (set(expectedFiles) != set(zipFileSet)):
        print(expectedFiles)
        print(zip_file.namelist())
        log.debug("dbImport infiles dont match, aborting")
        resultCode = 2
        resultText = "Files in zip archive do not match!"
        return resultText,resultCode


    log.debug("dbImport zip file passed all checks")

   


    ormDict = {}
    imageDict = {}

    for fname in zip_file.namelist():
        with zip_file.open(fname,'r') as infile:
            if fname.endswith('.json'):
                text = b''.join(infile.readlines()).decode('utf-8')
                 # Check each file (except components.json) to ensure they are valid json
                if not validJSON(text) and (fname != 'components.json'):

                    resultCode = 2
                  #  resultText = fname
                    log.debug("dbImport One or more files in the archive are not valid JSON")
                    resultText = "One or more files in the archive are not valid JSON!"
                    return resultText,resultCode
                ormDict[fname] = text
            else:
                imageUUID = fname.split('.')[0].split('/')[1]
                imageDict[imageUUID] = infile.read()
    
 

    # Wipe ORM Database (YIKES)
    log.debug("dbImport Wiping ORM database")
    CVSSEngagementFinding.objects.all().delete()
    DREADEngagementFinding.objects.all().delete()
    ProactiveEngagementFinding.objects.all().delete()
    DREADFindingGroup.objects.all().delete()
    CVSSFindingGroup.objects.all().delete()
    ProactiveFindingGroup.objects.all().delete()
    BaseFindingGroup.objects.all().delete()
    Engagement.objects.all().delete()
    Report.objects.all().delete()
    SavedReport.objects.all().delete()
    PageTemplate.objects.all().delete()
    CVSSDatabaseFinding.objects.all().delete()
    DREADDatabaseFinding.objects.all().delete()
    ProactiveDatabaseFinding.objects.all().delete()
    DatabaseFindingCategory.objects.all().delete()
    DREADFinding.objects.all().delete()
    ProactiveFinding.objects.all().delete()
    Revision.objects.all().delete()
    Customer.objects.all().delete()
    ImageModel.objects.all().delete()


    # Build ORM Database back up
    log.debug("dbImport Building ORM Database back up")
    for modelJson in reversed(expectedFiles):
        if modelJson != 'components.json':
            log.debug(f"restoring ORM model ({modelJson})")
            for element in serializers.deserialize("json", ormDict[modelJson]):
                element.save()



    # Import Images

    for imageUUID,data in imageDict.items():
        try:
            p = ImageModel.objects.get(id=imageUUID)
            p.data = data
            p.save()
           
        except:
            # we probbaly had an orphan image, just drop it
            log.debug(f"dbImport failed to match image {imageUUID} with imageModel, possible orphan, dropping")


    # Import mongo database
    log.debug("dbImport wiping mongo db")
    # first, wipe the collection

    if MONGO_CONFIG['password']:
        client = pymongo.MongoClient(MONGO_CONFIG['host'], int(MONGO_CONFIG['port']), username=MONGO_CONFIG['user'], password=MONGO_CONFIG['password'])
    else:
        client = pymongo.MongoClient(MONGO_CONFIG['host'], int(MONGO_CONFIG['port']))
    db = client[MONGO_CONFIG['database']]
    collection = db.report_components.remove({})

    # write temp file for mongoimport to use
    tempfilePath = "/tmp/writehat_import_mongotemp.json"
    if os.path.exists(tempfilePath):
      os.remove(tempfilePath)

    try:  
        fout = open(tempfilePath,'w',encoding="utf8")
        fout.write(ormDict['components.json'])
        fout.close()
    except Exception as e:
        resultText = "Error saving mongo data to temp file: %s" % e
        resultCode = 2
        return resultText,resultCode


    log.debug("dbImport importing mongo db")
    try:
    # push mongo data

        result = subprocess.run(['mongoimport',
                             '--collection=report_components',
                             f'''--db={MONGO_CONFIG['database']}''',
                             '--host="mongo:27017"',
                             f'''--username="{MONGO_CONFIG['user']}"''',
                             f'''--password="{MONGO_CONFIG['password']}"''',
                             '--authenticationDatabase',
                              'admin', 
                              f'--file={tempfilePath}',
                              ], stdout=subprocess.PIPE)

    except:
        resultText = "Error during mongoimport: %s" % result
        resultCode = 2
        return resultText,resultCode

    # clean up temp file
    if os.path.exists(tempfilePath):
        os.remove(tempfilePath)


    resultText = fileobject.name
    resultCode = 1
    return resultText,resultCode


