# Helpful functions used throughout the app

import json
from uuid import UUID

#needed to fix a python issue with encoding UUID's
class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            # if the obj is uuid, we simply return the value of uuid (as a string)
            return str(obj)
        return json.JSONEncoder.default(self, obj)