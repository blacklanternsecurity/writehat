import sys
from pathlib import Path
package_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(package_path))

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'writehat.settings'
import django
django.setup()

from writehat.lib.customer import *
from writehat.lib.engagement import *

engagements = list(Engagement.objects.all())

for e in engagements:
    try:
        customer = Customer.objects.filter(shortName=e.companyShortName)[0]
    except (Customer.DoesNotExist, IndexError):
        try:
            customer = Customer.objects.filter(name=e.companyName)[0]
        except (Customer.DoesNotExist, IndexError):
            customer = Customer(
                name=e.companyName,
                shortName=e.companyShortName,
                address=e.companyAddress,
                POC=e.companyPOC,
                email=e.companyEmail,
                phone=e.companyPhone
            )
            customer.save()
    e.customerID = customer.id
    e.save(update_fields=['customerID'])