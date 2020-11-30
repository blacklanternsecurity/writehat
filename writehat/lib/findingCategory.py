from django.db import models
from writehat.models import WriteHatBaseModel


#This defines the categories that findings can belong to. This is an infinitely nestable class with a parent-child structure.
class DatabaseFindingCategory(WriteHatBaseModel):

    categoryParent = models.UUIDField(editable=False,null=True)

    def getCategoryBreadcrumbs(self):
        from writehat.lib.findingCategory import DatabaseFindingCategory
        breadcrumbs = []
        breadcrumbs.append(self.name)
        currentNode = self
        rootNode = DatabaseFindingCategory.getRootNode()
        while 1:
            #print(currentNode.categoryParent)
            if currentNode.categoryParent == rootNode.id:
                break
            else:
                parentNode = DatabaseFindingCategory.objects.get(id=currentNode.categoryParent)
                breadcrumbs.append(parentNode.name)
                currentNode = parentNode
        #print(breadcrumbs)
        return breadcrumbs


    @property
    def fullName(self):

        return ' -> '.join(self.getCategoryBreadcrumbs()[::-1])


    #@classmethod
    #def getRootNode(cls):
    #    return cls.objects.filter(categoryParent__isnull=True).first()

    @classmethod
    def getRootNode(cls):
        try:
            #intialize the growTree function with the root node
            rootNode = cls.objects.filter(categoryParent__isnull=True)[0]
        except IndexError:
            # We assume the database is brand new, so we will create the root node   
            rootNode = cls()
            rootNode.name = "root"
            rootNode.save()
        return rootNode


    @classmethod
    def getCategoriesFlat(cls):
        flatCategoryList = []
        #   rootNode = getRootNode()
        nonRootNodes = cls.objects.filter(categoryParent__isnull=False)
        #print(len(nonRootNodes))
        # For all the nodes that arent the root nodes
        for node in nonRootNodes:
            breadcrumbs = node.getCategoryBreadcrumbs()
            if len(breadcrumbs) > 0:
                flatCategoryList.append({'id':str(node.id),'name':' -> '.join(breadcrumbs[::-1])})
        return sorted(flatCategoryList, key=lambda k: k['name'])
