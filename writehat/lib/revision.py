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
    fieldText = models.TextField(max_length=30000, blank=True)
    version = models.IntegerField()
    isComponent = models.BooleanField(default=False)
    owner = models.CharField(max_length=50,null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['version', 'fieldName', 'parentId'], name='Enforce Version Unique')]
        


    @classmethod
    def new(cls,owner,componentID,fieldName,fieldText,isComponent):

        log.debug(f"Revision.new() called; uuid: {componentID} fieldName {fieldName} owner {owner}")

        

        version = cls.getNextVersion(componentID, fieldName)
        revision = cls(parentId=componentID, fieldName=fieldName, version=version, fieldText=fieldText,isComponent=isComponent,owner=owner)
        revision.clean_fields()
        return revision

    # We only want N revisions stored (N is set in settings.py) so clean up any extras when we add more
    def cleanUp(self):
        cutoff = self.version - settings.MAX_REVISIONS + 1
        y = Revision.objects.filter(parentId=self.parentId, fieldName=self.fieldName, version__lt=cutoff)
        for i in y:
            log.debug(f"Revision.cleanUp() called; deleting revision with UUID: {i.id} (version: {i.version})")
            i.delete()

    def save(self):
        log.debug(f"Revision.save() called; uuid: {self.id} fieldName {self.fieldName} owner {self.owner} [next version:{self.version}]")
        self.cleanUp()
        super().save()


    # Given a component ID, return a json object with all of the fields / versions numbers
    @classmethod
    def listRevisions(cls,parentId,isComponent,field):
        y = Revision.objects.filter(parentId=parentId,isComponent=isComponent,fieldName=field)
        revisionDict = {}
        for v in y:
            revisionDict[int(v.version)] = [v.createdDate.strftime("%m/%d/%Y %H:%M:%S"),v.owner]
        sortedDict = {k: revisionDict[k] for k in sorted(revisionDict,reverse=True)}
        return sortedDict


    # Given a component ID and fieldname, determine what the next version number will be
    def getNextVersion(id,fieldName):
        y = Revision.objects.filter(parentId=id,fieldName=fieldName)
        try:
            version = y.aggregate(Max('version'))['version__max']
        except IndexError as e:
            version = 0

        if version == None:
            version = 0

        return version + 1

    @classmethod
    def getMostRecent(cls,parentId,isComponent,fieldName):
        y = Revision.objects.filter(parentId=parentId,isComponent=isComponent,fieldName=fieldName)
        try:
            version = y.aggregate(Max('version'))['version__max']
        except IndexError as e:
            version = 1
        return Revision.objects.get(parentId=parentId,fieldName=fieldName,version=version)        

 
 #   def compare(self,fromText,toText):
    #    # p = BaseComponent.get(self.parentId)
    #    return self.diff(fromText,toText)
            



    @staticmethod
    def diff(source,destination):

        output = []
        outputGenerator = difflib.unified_diff(source.split('\n'),destination.split('\n'),fromfile="source",tofile="destination",lineterm='')
        for line in outputGenerator:
            output.append(line)
        return '\n'.join(output)





    #    diffDict = {}
     #   diffList = []
     #   matcher = difflib.SequenceMatcher(None,current,previous)
     #   for tag, i1, i2, j1, j2 in matcher.get_opcodes():
      #      if tag == 'delete':
     #           diffList.append(('delete',i1,i2,j1,j2))
     #       elif tag == 'equal':
      #          diffList.append(('equal',i1,i2,j1,j2))
      #      elif tag == 'insert':
      #          diffList.append(('insert',i1,i2,j1,j2))
      #      elif tag == 'replace':
      #          diffList.append(('replace',i1,i2,j1,j2))
     #   diffDict = {'opList':diffList,'previous':previous}
     #   return json.dumps(diffDict)



