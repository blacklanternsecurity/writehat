import json
import string
import logging
from uuid import UUID
from django.core.exceptions import ValidationError




log = logging.getLogger(__name__)


# Function to validate if incoming JSON is valid
def validJSON(myjson):
    try:
        json_object = json.loads(myjson)
    except(ValueError):
        return False
    return True


# Validate incoming data for names for security and data hygene purposes
allowed_for_names = set(string.ascii_lowercase + string.ascii_uppercase + string.digits + \
    """!()*+, -./:?@[]_&\"""")

def isValidName(name):
    if not (type(name) == str and len(name) > 0 and (set(name) <= allowed_for_names)):
        raise ValidationError(f'Invalid Name: {name}')

# use this if you need a boolean return
def isValidNameBool(name):
    try:
        isValidName(name)
    except ValidationError:
        return False
    return True



# Stricter name validation for python module names, etc.
allowed_for_strict_names = set(string.ascii_lowercase + string.ascii_uppercase + string.digits + '_')

def isValidStrictName(name):
    if type(name) == str and len(name) > 0 and (set(name) <= allowed_for_strict_names):
        return True
    return False


allowed_for_model_hints = set(string.ascii_lowercase + string.ascii_uppercase + ' ')
def isValidModelHint(name):
    if type(name) == str and len(name) > 0 and (set(name) <= allowed_for_model_hints):
        return True
    return False

def isValidUUID(uuid_string):

    try:
        val = UUID(uuid_string, version=4)
    except ValueError:
        return False
    return True


def isValidUUIDList(uuidlist):

    for x in uuidlist:
        if isValidUUID(x) == False:
            return False
    return True


def isValidCategoryName(categoryName):

    isValidated = False
    if categoryName:
        isValidated = True
    return isValidated


def isValidComponentJSON(componentJSON):
    '''
    Takes an encoded JSON string of report components
    raises ValidationError if there are problems with the component list
    '''

    componentList = isValidJSON(componentJSON)
    isValidComponentList(componentList)


def isValidJSON(j):

    try:
        return json.loads(j)
    except json.JSONDecodeError:
        raise ValidationError(f'Invalid JSON: {j}')



def isValidJSONList(j):

    try:
        l = json.loads(j)
        if type(l) == list and all([type(e) == str for e in l]):
            return l
        else:
            raise ValidationError(f'Invalid list: {j}')
    except json.JSONDecodeError:
        raise ValidationError(f'Invalid JSON: {j}')



def isValidComponentList(componentList, new=False):
    '''
    takes a Python list of report component dict() objects
    raises ValidationError if there are problems with the component list

    When new=True, a blank or missing UUID is allowed
    '''

    for component in componentList:

        # make sure component has required fields
        if 'type' not in component or ('uuid' not in component and not new):
            raise ValidationError(f'Component UUID or type missing: {componentList}')

        # make sure all keys are valid names
        for k,v in component.items():
            if not k in ['uuid', 'type', 'children']:
                raise ValidationError(f'Invalid component key: "{k}"')
            if k == 'children':
                if type(v) == list:
                    # recursively validate children
                    isValidComponentList(v, new=new)
                else:
                    raise ValidationError(f'Invalid component children: "{v}"')
            else:
                if not isValidNameBool(v):
                    raise ValidationError(f'Invalid component value: "{v}"')

        # make sure UUID value is valid
        if not new:
            if not isValidUUID(component['uuid']):
                raise ValidationError(f'Invalid component UUID: {component["uuid"]}')
        elif 'uuid' in component:
            if not (isValidUUID(component['uuid']) or len(component['uuid']) == 0):
                raise ValidationError(f'Invalid component UUID: {component["uuid"]}')



def isRecursiveSafe(rootNode,currentNode,targetNode,targetParent):
    from writehat.lib.findingCategory import DatabaseFindingCategory
    solved = False
    currentParent = DatabaseFindingCategory.objects.get(id=currentNode.categoryParent)
    observedParents = []
    observedParents.append(currentNode.id)
    while solved == False:
        # manually change the parent of the result we are trying to simulate
        if str(currentNode.id) == str(targetNode):
            currentParent = DatabaseFindingCategory.objects.get(id=targetParent)

        # check if current parent is in observer parents (indicating a loop)
        if currentParent.id in observedParents:
            return False

        # if it wasnt already there, add it now
        observedParents.append(currentParent.id)

        # if the current parent is the root node, and we haven't failed yet, we're good.
        if currentParent.id == rootNode.id:
            return True
            
        # this round is inconclusive. we neither failed the observed parents check, nor did we reach the root node. Move up the chain and try again.
        else:
            # we move up one level
            currentNode = currentParent

            # new parent to the current node
            currentParent = DatabaseFindingCategory.objects.get(id=currentNode.categoryParent)
    return True


def isValidParent(uuid,parentUUID):
    from writehat.lib.findingCategory import DatabaseFindingCategory
    rootNode = DatabaseFindingCategory.objects.filter(categoryParent__isnull=True)[0]
    
    # if the uuid is the same as the parent, no need to go further - thats bad
    if uuid == parentUUID:
        raise ValidationError('circular reference')
    else:
        # all existing category nodes
        allCategories = DatabaseFindingCategory.objects.all()
        # loop through every node and make sure its not making an infinite loop.
        for category in allCategories:
            if category.id != rootNode.id:
                if not isRecursiveSafe(rootNode,category,uuid,parentUUID):
                    log.debug("isValidParent failed invinite loop check for UUID: %s" % uuid)
                    raise ValidationError('circular reference')
        return True

