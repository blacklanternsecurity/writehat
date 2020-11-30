import os
import pymongo
import importlib
from pathlib import Path
from writehat.lib.errors import *
from writehat.validation import isValidStrictName


# read writehat config
import toml
writehat_config_file = Path(__file__).parent.parent / 'config/writehat.conf'
writehat_config = toml.load(str(writehat_config_file))



def createAdminUser():

    import os
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'writehat.settings')
    import django
    django.setup()
    from django.contrib.auth.models import User
    from django.db import Error as DjangoError
    try:
        user = User.objects.create_superuser(
            username=writehat_config['writehat']['admin_username'],
            password=writehat_config['writehat']['admin_password']
        )
        user.save()
    except DjangoError:
        pass


def fixMigrationBug():

    filename = Path(__file__).parent.parent / 'migrations/__init__.py'
    try:
        filename.parent.mkdir(exist_ok=True)
        filename.touch()
    except:
        pass


# get a list of valid components
def getComponentList(componentType=None):

    detectedComponents = []
    masterComponentList = dict()
    projectLocation = Path(__file__).resolve().parent.parent
    module_candidates = next(os.walk(projectLocation / 'components'))[2]


    # make a list of all the .py files
    for file in module_candidates:

        file = Path(file)

        if file.suffix == ('.py') and file.stem not in ['base'] \
            and (componentType is None or componentType == str(file.stem)):

            # make sure filename works as a python module
            if isValidStrictName(file.stem):
                detectedComponents.append(file.stem)

    # for each detected file, try to import
    for detectedComponent in detectedComponents:
        componentName = 'writehat.components.{}'.format(detectedComponent)

        try:
            componentModule = importlib.import_module(componentName)

            componentClass = componentModule.Component
            componentClass.type = detectedComponent

            if componentType is not None and componentType == detectedComponent:
                # just return the class if it was requested
                return componentClass

            # otherwise, build a dictionary with all of them
            else:
                masterComponentList[detectedComponent] = componentClass

        except ImportError as e:
            print('[!] Error importing {}:\n{}\n'.format(componentName, str(e)))
            continue

    if componentType is not None:
        raise ComponentError('Component "{}" not found'.format(str(componentType)))

    return masterComponentList


# simpler JSON format
def getComponentListJSON():

    availableComponents = [{
        'name': c.default_name,
        'type': c.type,
        'isContainer': c.isContainer,
        'iconType': c.iconType,
        'iconColor': c.iconColor,
        'id': '',
    } for c in getComponentList().values()]
    availableComponents.sort(key=lambda x: x['name'])
    return availableComponents




def get_db_obj(host, port, database, username=None, password=None):
    '''
    Authenticates to mongodb and returns the databse object
    '''

    try:
        # Todo: encode UUIDs using newer v4 method in mongo?
        #codec_options = CodecOptions(document_class=RawBSONDocument)
        if password:
            client = pymongo.MongoClient(host, port, username=username, password=password)
        else:
            client = pymongo.MongoClient(host, port)
        db = client[database]

    except pymongo.errors.PyMongoError as e:
        error = str(e) + '\n'
        try:
            error += str(e.details)
        except AttributeError:
            pass
        raise DatabaseError(error)

    return db