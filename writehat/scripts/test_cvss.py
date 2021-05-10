import sys
from pathlib import Path
package_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(package_path))

import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'writehat.settings'
import django
django.setup()

from writehat.lib.cvss import *

log = logging.getLogger(__name__)

vectors = Path(__file__).parent / 'cvss3.1_test_vectors.txt'
with open(vectors) as f:
    vectors = [line.strip() for line in f.read().splitlines() if line.strip()]

failed = 0
for line in vectors:
    vector, scores = line.split(' - ')
    score = float(scores.strip('()').split(',')[-1])
    c = CVSS(vector)
    if not c.score == score:
        log.warning(f'FAILED: {line}, {c.score}')
        failed += 0

log.warning(f'FAILED: {failed:,}')