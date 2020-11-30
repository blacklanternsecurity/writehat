from django import template
from django.utils.safestring import mark_safe
from writehat.lib.markdown import render_markdown

register = template.Library()

@register.filter
def addstr(arg1, arg2):
    '''concatenate arg1 & arg2'''
    return str(arg1) + str(arg2)


@register.simple_tag(takes_context=True)
def markdown(context, arg1):
    '''render in markdown'''

    return mark_safe(render_markdown(arg1, context))
