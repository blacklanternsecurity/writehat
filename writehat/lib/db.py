import uuid
import logging
import pymongo
from .errors import *
from django.db import models
from datetime import datetime
from django.conf import settings



log = logging.getLogger(__name__)

class BaseField():
    '''
    This class stores metadata about a field
    Such as whether it's templatable, etc.

    Can be used when creating a JSONModel
    to set initial default values if needed

    NOTE: the actual value is not stored in this class
    NOTE: use one of its children; do not use this class
    '''
    _defaultValue = None

    def __init__(self, templatable=False, default=None):

        if default is not None:
            self.defaultValue = default
        else:
            self.defaultValue = self._defaultValue
        self.templatable = templatable


class StringField(BaseField):

    _defaultValue = ''

    def __init__(self, markdown=False, **kwargs):

        self.markdown = markdown
        super().__init__(**kwargs)


class BoolField(BaseField):

    _defaultValue = False


class IntField(BaseField):

    _defaultValue = 0

class ForeignKeyField(BaseField, models.ForeignKey):

    _defaultValue = False

class UUIDField(BaseField):
    pass


class DateField(BaseField):

    @classmethod
    def defaultValue(cls):
        
        return datetime.now()


class ReviewStatusField(BaseField):

    _defaultValue = 'unassigned'
    _choices = {
        'unassigned': 'Not Started',
        'red': 'Writing',
        'yellow': 'Needs Review',
        'green': 'Complete'
    }



class attr_dict(dict):
    '''
    Custom class to allow accessing values using "dictionary.key" syntax
    '''

    def __init__(self, *args, **kwargs):
        '''
        convert all dictionaries to this class
        '''
        super().__init__(*args, **kwargs)
        self._convert_to_attr_dict(self)


    def __getattr__(self, attr):
        try:
            return self[attr]
        except KeyError:
            raise AttributeError(f'No attribute "{attr}"')


    def update(self, d):

        super().update(attr_dict(d))


    @classmethod
    def _convert_to_attr_dict(cls, d):
        for k,v in d.items():
            if type(v) == dict:
                v = cls(v)
            elif type(v) in (list, tuple, set):
                d[k] = []
                for e in v:
                    if type(e) == dict:
                        e = cls(e)
                    d[k].append(e)
            d[k] = v



class JSONModel(attr_dict):
    '''
    Similar to Django's model, except it does not require
    migrations when fields are added/removed (yay nosql!!)
    '''

    _collection = ''

    # these fields exist on all objects
    # fieldName: Templatable
    startingFields = {
        'name': StringField(templatable=True),
        'createdDate': DateField(),
        'modifiedDate': DateField(),
        'reportParent': UUIDField(),
        'databaseParent': UUIDField()
    }

    def __init__(self, id=None, name='Undefined', validFields={}, reportParent=None, databaseParent=None):

        self.validFields = validFields
        self.validFields.update(self.startingFields)

        # set up the database
        # NOTE: no actual traffic is generated until a query is made

        self.db = settings.MONGO_DB

        try:
            # relation to an actual report (e.g. the UUID of the associated report)
            self['reportParent'] = (None if reportParent is None else uuid.UUID(str(reportParent)))
            # relation to other objects in the database (e.g. the UUID of the original DB object after it's been attached to a report)
            # used to hierarchically organize components, findings, etc.
            # for a finding, this is the category
            self['databaseParent'] = (None if databaseParent is None else uuid.UUID(str(databaseParent)))
        except ValueError as e:
            raise DatabaseError(f'Invalid UUID: {e}')

        # generate new UUID if we're creating a new object
        if id is None:
            self['_id'] = uuid.uuid4()
            self['createdDate'] = datetime.now()
            self['modifiedDate'] = datetime.now()
            self['name'] = str(name)

        # otherwise, go get the data
        else:
            self['_id'] = uuid.UUID(str(id))
            self.fetch()

            # fill in missing fields with default values
            # this is needed if a new field was added which doesn't have values yet
            for k,v in self.validFields.items():
                if not k in self:
                    self.update({k: v.defaultValue})


    @property
    def json(self):

        #return self._stringify_dict_values(self)
        return attr_dict(self)


    @property
    def id(self):

        return self['_id']


    @property
    def collection(self):

        if self.reportParent:
            return self.db[f'report_{self._collection}']
        else:
            return self.db[self._collection]


    def clone(self, name=None, reportParent=None, templatableOnly=True):
        '''
        Creates a clone of the object.  If "reportParent" is specified, it is attached to a report.
        '''

        if name is None:
            name = self['name']

        # instantiate the clone
        clone = self.__class__(validFields=self.validFields, reportParent=reportParent)

        # copy all the values from self
        clone.update(self, templatableOnly=templatableOnly)
        # override a few of them
        clone['name'] = name
        clone['createdDate'] = datetime.now()
        clone['reportParent'] = reportParent

        # assign self as the clone's parent if self is not attached to a report
        # otherwise, it will inherit self's databaseParent
        if self['reportParent'] is None:
            clone['databaseParent'] = self.id

        # save and return
        return clone


    # revisions hook

    def updateRevision(self):
        from writehat.lib.revision import Revision
        from django_currentuser.middleware import get_current_authenticated_user

        revisable_fields = {}
        for key, val in self.validFields.items():
            is_markdown = getattr(val, "markdown", False)
            if is_markdown:
                revisable_fields[key] = self[key]

        for field, new_value in revisable_fields.items():
            needsUpdate = False
            try:
                # check to see if previous revisions exist
                mostRecent = Revision.getMostRecent(parentId=self.id,isComponent=True,fieldName=field)

                # determine if this save is different than the last revision
                if mostRecent.fieldText != self[field]:
                    needsUpdate = True
            except Revision.DoesNotExist:
                needsUpdate = True
    
            # create a new revision
            if needsUpdate:
                log.debug(f'component has changed on record with componentID: {self.id}, generating new Revision')
                r = Revision.new(owner=get_current_authenticated_user(),componentID=self.id, isComponent=True,fieldName=field, fieldText=new_value)
                r.save()



    def save(self, updateTimestamp=True):

        log.debug(f'db.save() called')
        if updateTimestamp:
            self['modifiedDate'] = datetime.now()
        result = self._mongo_op(self.collection.update, {'_id': self.id}, self, upsert=True)
        log.debug(f'result: {result}')

        self.updateRevision()



    def delete(self):
        from writehat.lib.revision import Revision
        self._mongo_op(self.collection.delete_one, {'_id': self.id})

        log.debug(f"component.delete() cascading Revision delete initiated {self.id}")
        revisions = Revision.objects.filter(parentId=self.id)
        for revision in revisions:
            log.debug(f"Revision.delete() deleting Revision with UUID: {revision.id}")
            revision.delete()


    def fetch(self):

        self.collection
        db_result = self._mongo_op(self.db['report_' + self._collection].find_one, {'_id': self.id})
        if db_result is None:
            db_result = self._mongo_op(self.db[self._collection].find_one, {'_id': self.id})

        if db_result is None:
            raise DatabaseError(f'ID {self.id} not found')
        else:
            self.update(db_result)

        # make sure some required fields exist
        if 'createdDate' not in self:
            self['createdDate'] = datetime.now()
        if 'modifiedDate' not in self:
            self['modifiedDate'] = datetime.now()
        if 'reportParent' not in self:
            self['reportParent'] = None
        if 'databaseParent' not in self:
            self['databaseParent'] = None
        if 'name' not in self:
            try:
                self['name'] = str(self['type'])
            except KeyError:
                self['name'] = 'Undefined'



    def update(self, dictionary, templatableOnly=False):


        log.debug(f"db.update() called")
        for key,value in dictionary.items():
            if key in self.validFields:
                if (not templatableOnly) or self.validFields[key].templatable == True:
                    super().update({key: value})
            else:
                log.debug(f'Key "{key}" is not valid for this model')


    @classmethod
    def fetch_all(cls, database=True, report=False):

        if database:
            for result in cls._mongo_op(settings.MONGO_DB[cls._collection].find, {}, {'_id': True}):
                yield result['_id']

        if report:
            for result in cls._mongo_op(settings.MONGO_DB['report_' + cls._collection].find, {}, {'_id': True}):
                yield result['_id']


    @staticmethod
    def _mongo_op(operation, *args, **kwargs):
        '''
        attempts a mongodb operation and raises a "DatabaseError" containing all details if the operation fails
        '''

        try:
            return operation(*args, **kwargs)

        except pymongo.errors.PyMongoError as e:
            error = str(e) + '\n'
            try:
                error += str(e.details)
            except AttributeError:
                pass
            raise DatabaseError(error)


    @staticmethod
    def _stringify_dict_values(dictionary):

        new_dict = {}

        for key,value in dictionary.items():
            if type(value) == dict:
                new_dict[key] = self._stringify_dict_values(value)
            elif type(value) == bool:
                new_dict[key] = value
            else:
                new_dict[key] = str(value)

        return new_dict


class JSONComponentModel(JSONModel):
    _collection = 'components'
