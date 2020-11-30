#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import pymongo
from writehat.settings import MONGO_CONFIG

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'writehat.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    if 'flush' in sys.argv:
        print('[+] Deleting WRITEHATJSON database')
        if MONGO_CONFIG['password']:
            mongo_client = pymongo.MongoClient(
                MONGO_CONFIG['host'],
                int(MONGO_CONFIG['port']),
                username=MONGO_CONFIG['user'],
                password=MONGO_CONFIG['password']
            )
        else:
            mongo_client = pymongo.MongoClient('127.0.0.1', 27017)
        mongo_client.drop_database('WRITEHATJSON')
        print('[+] Done\n')

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
