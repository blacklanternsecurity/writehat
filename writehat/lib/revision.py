import difflib
import logging
from django.db import models
from django.conf import settings
from django.db.models import Max
from writehat.components.base import *
from writehat.models import WriteHatBaseModel



log = logging.getLogger(__name__)


class Revision(WriteHatBaseModel):

    parentId = models.UUIDField(editable=True)
    fieldName = models.CharField(max_length=50)
    fieldText = models.TextField(max_length=30000)
    version = models.IntegerField()


    @classmethod
    def new(cls, componentID, fieldName, fieldText):

        version = cls.getNextVersion(componentID, fieldName)
        revision = cls(parentId=componentID, fieldName=fieldName, version=version, fieldText=fieldText)
        revision.clean_fields()
        return revision

    # We only want N revisions stored (N is set in settings.py) so clean up any extras when we add more
    def cleanUp(self):
        cutoff = self.version - settings.MAX_REVISIONS + 1
        y = Revision.objects.filter(parentId=self.parentId, fieldName=self.fieldName, version__lt=cutoff)
        for i in y:
            log.debug(f"Revision.cleanUp() called; deleting revision with UUID: {self.id} (version: {self.version})")
            i.delete()

    def save(self):
        log.debug(f"Revision.save() called; uuid: {self.id} fieldName {self.fieldName} [next version:{self.version}]")
        self.cleanUp()
        super().save()


    # Given a component ID, return a json object with all of the fields / versions numbers
    @classmethod
    def listRevisions(cls,parentId):
        y = Revision.objects.filter(parentId=parentId)
        revisionDict = {}
        for v in y:
            if v.fieldName not in revisionDict.keys():
                revisionDict[v.fieldName] = []
            revisionDict[v.fieldName].append(v.version)
        return json.dumps(revisionDict)


    # Given a component ID and fieldname, determine what the next version number will be
    def getNextVersion(id,fieldName):
        y = Revision.objects.filter(parentId=id,fieldName=fieldName)
        try:
            version = y.aggregate(Max('version'))['version__max']
        except IndexError as e:
            version = 1

        if version == None:
            version = 1

        return version + 1


    def compare(self,fieldName,currentText):
        # p = BaseComponent.get(self.parentId)
        return self.diff(currentText,self.fieldText)
        
    @staticmethod
    def diff(current,previous):
        diffDict = {}
        diffList = []
        matcher = difflib.SequenceMatcher(None,current,previous)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'delete':
                diffList.append(('delete',i1,i2,j1,j2))
            elif tag == 'equal':
                diffList.append(('equal',i1,i2,j1,j2))
            elif tag == 'insert':
                diffList.append(('insert',i1,i2,j1,j2))
            elif tag == 'replace':
                diffList.append(('replace',i1,i2,j1,j2))
        diffDict = {'opList':diffList,'previous':previous}
        return json.dumps(diffDict)



