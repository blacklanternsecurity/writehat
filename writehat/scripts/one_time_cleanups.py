import sys
from pathlib import Path
package_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(package_path))

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'writehat.settings'
import django
django.setup()

import uuid

from writehat.settings import *
from writehat.lib.figure import *
from writehat.lib.report import *

fixed_reportparents = []
cleaned_components = []
cleaned_engagementreports = []
cleaned_figures = []


### FIX REPORTPARENTS ###

client = MONGO_DB.report_components
for r in list(Report.objects.all()) + list(SavedReport.objects.all()):
    for c in r.flattened_components:
        current_reportParent = uuid.UUID(str(c.reportParent))
        new_reportParent = uuid.UUID(str(r.id))
        if current_reportParent != new_reportParent:
            client.update_one({'_id': uuid.UUID(str(c.id))}, {'$set': {'reportParent': uuid.UUID(str(r.id))}})
            fixed_reportparents.append(c)


### REMOVE ORPHANED COMPONENTS ###

# make a list of all components
all_components = set()
for c in client.find({}):
    all_components.add(uuid.UUID(str(c['_id'])))

# make a list of all the components that are attached to reports
valid_components = set()
for r in list(Report.objects.all()) + list(SavedReport.objects.all()):
    for c in r.flattened_components:
        valid_components.add(uuid.UUID(str(c.id)))

# delete the orphans
for i in all_components:
    if i not in valid_components:
        client.delete_one({'_id': i})
        cleaned_components.append(i)


### REMOVE ORPHANED ENGAGEMENT REPORTS ###

all_reports = list(Report.objects.all())
for r in all_reports:
    if r.engagement is None:
        r.delete()
        cleaned_engagementreports.append(r)


### REMOVE ORPHANED FIGURES ###

all_figures = set([uuid.UUID(str(f.id)) for f in ImageModel.objects.all()])
valid_figures = set()
for r in list(Report.objects.all()) + list(SavedReport.objects.all()):
    for f in r.figures:
        valid_figures.add(uuid.UUID(str(f.id)))
for p in list(PageTemplate.objects.all()):
    try:
        valid_figures.add(uuid.UUID(str(p.backgroundImageID)))
    except ValueError:
        continue

for f in all_figures:
    if f not in valid_figures:
        i = ImageModel.get(id=f)
        i.delete()
        cleaned_figures.append(i)


print(f'Fixed report parents for {len(fixed_reportparents):,} components')
print(f'Cleaned {len(cleaned_components):,} orphaned components')
print(f'Cleaned {len(cleaned_engagementreports):,} orphaned engagement reports')
print(f'Cleaned {len(cleaned_figures):,} orphaned figures')