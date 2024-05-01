from django_python3_ldap.utils import format_search_filters

from writehat.lib.startup import *

def custom_format_search_filters(ldap_fields):
    # Check for ldap config
    ldap_config = writehat_config.get('ldap', None)
    if ldap_config is not None:
        ldap_filter = ldap_config.get('filter', None)
        # Apply filter is value is present
        if ldap_filter is not None and ldap_filter:
            ldap_fields["memberOf"] = ldap_filter
    # Call the base format callable.
    search_filters = format_search_filters(ldap_fields)
    return search_filters
