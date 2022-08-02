from django.contrib import admin
from rest_framework.authtoken.admin import TokenAdmin

TokenAdmin.raw_id_fields = ['user']