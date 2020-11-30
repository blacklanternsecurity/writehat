# Custom error classes

# Base exception
class WriteHatError(Exception):
    pass


# Database exceptions
class DatabaseError(WriteHatError):
    pass


class WriteHatValidationError(WriteHatError):
    pass


# Report exceptions
class ReportError(WriteHatError):
    pass

# Report exceptions
class ReportCreationError(ReportError):
    pass

class ReportValidationError(WriteHatValidationError):
    pass


# Component exceptions
class ComponentError(WriteHatError):
    pass

class ComponentDatabaseError(ComponentError):
    pass

class ComponentFormError(ComponentError):
    pass

class ComponentFieldError(ComponentError):
    pass


# Finding exceptions
class FindingError(WriteHatError):
    pass

class FindingLoadError(FindingError):
    pass

class FindingCreateError(FindingError):
    pass

class FindingImportError(FindingError):
    pass

class FindingValidationError(WriteHatValidationError):
    pass


# Finding category exceptions
class CategoryError(WriteHatError):
    pass

class CategoryValidationError(WriteHatValidationError):
    pass

class CategoryRemoveError(CategoryError):
    pass

# Image upload / retrieval exeptions

class ImagesError(WriteHatError):
    pass

class ImagesUploadError(ImagesError):
    pass

class RevisionError(WriteHatError):
    pass

class EngagementError(WriteHatError):
    pass

class EngagementFindingError(FindingError):
    pass

class EngagementFgroupError(FindingError):
    pass

class DatabaseFindingError(FindingError):
    pass

# Dread data error
class DreadValidationError(WriteHatError):
    pass