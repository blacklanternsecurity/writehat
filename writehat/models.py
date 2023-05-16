import re
import uuid
import logging
from django.db import models
from writehat.validation import isValidName
from django.template.loader import render_to_string
from writehat.lib.errors import WriteHatValidationError

from django_currentuser.middleware import get_current_authenticated_user

log = logging.getLogger(__name__)


class MarkdownField(models.TextField):
    markdown = True


class WriteHatBaseModel(models.Model):
    '''
    Base model class that everything inherits from
    '''

    # common fields across all objects
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(blank=True, default=str, max_length=1000, validators=[isValidName])
    createdDate = models.DateTimeField(auto_now_add=True)
    modifiedDate = models.DateTimeField(auto_now=True)

    # override in the child class
    formClass = None

    # Don't create a table for this class
    class Meta:
        abstract = True


    @classmethod
    def new(cls, *args, **kwargs):
        '''
        This constructor instantiates and initializes new objects, override as necessary
        '''
        model = cls(*args, **kwargs)

        # validate all fields
        model.clean_fields()
        return model


    @classmethod
    def get(cls, *args, **kwargs):
        '''
        This constructor retrieves existing objects, override as necessary
        '''
        log.debug(f'{cls.__name__}.get() called')
        log.debug(f'  args: {args}')
        model = cls.objects.get(*args, **kwargs)

        # validate all fields
        model.clean_fields()
        return model


    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        # holds instantiated form class
        self._form_object = None


    @classmethod
    def get_all(cls):
        '''
        Yields all objects from database, validating all fields
        '''

        for model in cls.objects.all():
            model.clean_fields()
            yield model


    @classmethod
    def get_filter(cls, *args, **kwargs):

        for model in cls.objects.filter(*args, **kwargs):
            model.clean_fields()
            yield model


    def clone(self, name=None, destinationClass=None):

        excludedFieldNames = ['id', '_id']

        log.debug(f'{self.className}.clone() called')

        if destinationClass is None:
            destinationClass = self.__class__
        if name is None:
            name = 'Clone of ' + self.name

        destinationObject = destinationClass()

        sourceFieldNames = [f.name for f in self._meta.get_fields()]
        destinationFieldNames = [f.name for f in destinationObject._meta.get_fields()]

        for fieldName in sourceFieldNames:
            if fieldName not in excludedFieldNames \
                and fieldName in destinationFieldNames:

                log.debug(f'  copying {fieldName}')
                fieldValue = getattr(self, fieldName)
                setattr(destinationObject, fieldName, fieldValue)

        destinationObject.name = name

        destinationObject.id = None
        destinationObject.pk = None
        return destinationObject


    @classmethod
    def getBootstrapSelect(cls):
        '''
        Retrieves all objects and compiles human-friendly descriptions into list
        Used for bootstrap select menu
        '''
        selections = []
        for page in cls.objects.all():
            selections.append({
                'id': str(page.id),
                'name': f'{page.name}'
            })

        return sorted(selections, key=lambda x: x['name'])


    def updateFromForm(self, form):
        '''
        copy data from form into self
        '''

        log.debug(f'{self.className}.updateFormForm() called')

        validFieldNames = self._modelFields
        log.debug(f'validFieldNames: {validFieldNames}')
        #validModelNames = self._formToModel(form)
        #log.debug(f'validModelNames: {validModelNames}')

        if form.is_valid():
            log.debug(f'Updating fields from form in {self.className}')
            for label,value in self._formToModel(form).items():
                if label in validFieldNames:
                    setattr(self, label, value)
                    log.debug(f'  successfully copied {label} from form to {self.className}')
                else:
                    log.error(f'  form field "{label}" not found in model "{self}"')
        else:
            log.error(f'Invalid form passed to {self.className}.updateFromForm()')
            for k,v in form.errors.items():
                log.error(f'Form error for field ({k}) [{v}]')
            raise WriteHatValidationError(f'Invalid data in {self.className} form')


    def updateFromPostData(self, postData, formClass=None):

        if formClass is None:
            formClass = self.formClass
            
        try:
            form = formClass(postData)
        except TypeError:
            raise AttributeError(f'Failed to initialize {self.className}.formClass: please define it in the class or pass into updateFromPostData()')
        self.updateFromForm(form)


    @property
    def form(self):

        if self._form_object is None:
            self.populateForm()
        return self._form_object


    def populateForm(self, formClass=None, **kwargs):
        '''
        Copy data from self into self._form_object
        '''

        log.debug(f'{self.className}.populateForm() called')

        if formClass is None:
            formClass = self.formClass
        
        initialFormData = dict()
        validFormFields = self._formFields(formClass=formClass)
        log.debug(f'validFormFields: {validFormFields}')

        for label,value in self._modelToForm().items():
            if label in validFormFields:
                initialFormData.update({label: value})
                log.debug(f'   Successfully copied: {label}')
            # else:
            #    log.debug(f'   Did not copy: {label}')

        #log.debug(f'initialFormData: {initialFormData}')

        try:
            self._form_object = formClass(initial=initialFormData, **kwargs)
        except TypeError as e:
            raise AttributeError(f'Failed to initialize {self.className}.formClass: {e}: please define it in the class or pass into updateFromPostData()')

        return self._form_object


    def _modelToForm(self):
        '''
        Formats model data for form
        When copying from database to form, do extra processing if required
        Override in child class if needed
        '''

        # by default, just return dictionary with all model fields
        return self._json


    def _formToModel(self, form):
        '''
        Formats form data for model
        When copying from form to database, do extra processing if required
        Override in child class if needed
        '''

        # by default, just return dictionary with all form fields
        modelFields = form.cleaned_data
        #log.debug(f'_formToModel() modelFields: {modelFields}')
        return modelFields


    @property
    def _modelFields(self):
        '''
        Returns list of valid field names in model
        '''

        return [f.name for f in self._meta.get_fields() if not f.name.endswith('_ptr')]


    @property
    def _json(self):
        '''
        Returns the model in the form of a dictionary
        '''

        return {f: getattr(self, f) for f in self._modelFields}


    def _formFields(self, formClass=None):
        '''
        Returns list of allowed field names in form
        '''

        if formClass is None:
            formClass = self.formClass

        try:
            return list(formClass().fields.keys())
        except TypeError:
            log.error(f'Failed to initialize {self.className}.formClass: please define it in the class or pass into updateFromPostData()')
            raise


    def save(self, *args, **kwargs):
        '''
        Validates all fields before saving to database
        '''
        updateTimestamp = kwargs.pop('updateTimestamp', True)
        isComponent = kwargs.pop('isComponent',False)


        if updateTimestamp:
            savedModel = super().save(*args, **kwargs)
        else:
            #super().save(update_fields=[])
            excluded_fields = ['modifiedDate']
            update_fields = [f.name for f in self._meta.fields if f.name not in excluded_fields and not f.auto_created and not f.primary_key]
            savedModel = super().save(*args, update_fields=update_fields, **kwargs)


        from writehat.lib.revision import Revision
        log.debug(f'{self.className}.save() called')
        self.clean_fields()

        for f in self._meta.fields:

            fieldType = type(f).__name__
            if fieldType == "MarkdownField":

                # look to see if there are existing revisions

                needsUpdate = False

                try:
                    # check to see if previous revisions exist
                    mostRecent = Revision.getMostRecent(parentId=self.id,isComponent=isComponent,fieldName=f.name)

                    # determine if this save is different than the last revision
                    if mostRecent.fieldText != getattr(self,f.name):
                        needsUpdate = True
                except Revision.DoesNotExist:
                    fieldContent = getattr(self,f.name)
                    needsUpdate = fieldContent is not None
          
                # create a new revision
                if needsUpdate == True:


                    log.debug(f'{f.name} field has changed on record {self.id}, generating new Revision')
                    r = Revision.new(owner=get_current_authenticated_user(), componentID=self.id, fieldName=f.name, isComponent=isComponent, fieldText=getattr(self,f.name))
                    r.save()

        return savedModel





    def find_and_replace(self, str1, str2, caseSensitive=True, markdownOnly=True):
        '''
        Replace all occurrences of str1 with str2
        NOTE: uses regex, do not expose directly to user
        '''

        if str1 and str2 and type(str1) == str and type(str2) == str:
            if caseSensitive:
                r = re.compile(str1)
            else:
                r = re.compile(str1, re.IGNORECASE)

            for f in self._meta.fields:
                try:
                    k = f.name
                    v = self.getattr(k)
                    markdown = getattr(f, 'markdown', False)
                    if not (markdownOnly and not markdown):
                        try:
                            setattr(self, k, r.sub(str2, v))
                        except AttributeError:
                            pass
                except (AttributeError, TypeError):
                    pass


    def simpleRedact(self, customer):
        '''
        Given a customer object, replace all instances of customer information with generic template keywords
        '''
        if customer is not None:
            for f in customer._meta.fields:
                v = getattr(customer, f.name, '')
                if v:
                    try:
                        self.find_and_replace(re.escape(v), '{ ' + f'customer.{f.name}' + ' }', markdownOnly=False)
                    except TypeError:
                        pass


    @property
    def className(self):

        return type(self).__name__

    @property
    def parent(self):
        return None

    @property
    def url(self):
        return '#'



from django.contrib.auth.models import User
class AssigneeUser(User):
    class Meta:
        proxy = True

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def __iter__(self):
        yield (self.id, str(self))
