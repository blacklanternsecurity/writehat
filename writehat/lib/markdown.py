import re
import bleach
import logging
import importlib
import markdown as md
from django.template.loader import render_to_string


log = logging.getLogger(__name__)


def getLogo(context):

    try:
        report = context.get('report', None)
        if report and report.pageTemplate and report.pageTemplate.logo:
            return report.pageTemplate.logo
    except (NameError, AttributeError):
        pass


reference_templates = {
    'finding': {
        'constructor': 'writehat.lib.engagementFinding.EngagementFinding.get_child',
        'template': 'reportTemplates/findingReference.html',
        'regex': re.compile(
            r'{ {0,2}finding\|(?P<id>[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12})\|(?P<fields>[ =01A-Za-z,]{0,50}) {0,2}}'
        ),
        'allowed_fields': ('number', 'index', 'name', 'severity'),
    },
    'component': {
        'constructor': 'writehat.components.base.BaseComponent.get',
        'template': 'reportTemplates/componentReference.html',
        'regex': re.compile(
            r'{ {0,2}component\|(?P<id>[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12})\|(?P<fields>[ =01A-Za-z,]{0,50}) {0,2}}'
        ),
        'allowed_fields': ('index', 'name'),
    },
    'figure': {
        'constructor': None,
        'template': 'reportTemplates/figure.html',
        'regex': re.compile(
            r'{ {0,2}(?P<id>[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12})\|(?P<size>[0-9]{1,3})\|(?P<caption>[^|{}]{0,3000}) {0,2}}'
        ),
        'allowed_fields': ('size', 'caption'),
    },
    'logo': {
        'constructor': getLogo,
        'template': 'reportTemplates/logo.html',
        'regex': re.compile(
            r'{ {0,2}logo\|(?P<size>[0-9]{1,3}) {0,2}}'
        ),
        'allowed_fields': ('size'),
    },
}

# Tags allowed for rendering markdown
markdown_tags = [
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'b', 'i', 'strong', 'em', 'tt',
    'p', 'br',
    'span', 'div', 'blockquote', 'code', 'pre', 'hr',
    'ul', 'ol', 'li', 'dd', 'dt',
    'a',
    'sub', 'sup',
    'hl', # custom color highlights
    'figcaption',
]

# Attributes allowed for rendering markdown
markdown_attrs = {
    '*': ['id', 'class'],
    'a': ['href', 'alt', 'title'],
    'th': ['align'],
    'td': ['align', 'finding-severity'],
    'hl': ['purple', 'red', 'orange', 'yellow', 'green', 'blue'], # custom color highlights
}


def to_bool(s):

    if any([m == s.lower() for m in ['1', 'yes', 'true']]):
        return True
    elif any([m == s.lower() for m in ['0', 'no', 'false']]):
        return False
    else:
        return s


def match_references(markdown_text, name, context, constructor, template, regex, allowed_fields):
    '''
    Yields the original matching text, UUID, template, and context for template rendering
    '''

    markdown_text = str(markdown_text)

    if type(constructor) == str:
        module, classname, fn = constructor.rsplit('.', 2)
        module = importlib.import_module(module)
        constructor = getattr(getattr(module, classname), fn)

    for match in regex.finditer(markdown_text):
        match_text = markdown_text[match.span()[0]:match.span()[-1]]
        match_context = dict(match.groupdict())
        fields = match_context.pop('fields', '')
        for field in fields.split(','):
            field = field.lower().strip()
            # assume "field" means "field=true"
            if field in allowed_fields:
                match_context.update({field: True})
            else:
                try:
                    k,v = field.split('=')
                    k,v = k.strip(), v.strip()
                    if k in allowed_fields:
                        context.update({k:to_bool(v)})
                except ValueError:
                    continue

        uuid = match_context.get('id', '').lower()
        if constructor is not None:
            if uuid:
                obj = constructor(id=uuid)
                match_context.update({name: obj})
            else:
                obj = constructor(context)
                try:
                    uuid = obj.id
                except AttributeError:
                    pass

            match_context.update({name: obj})

        else:
            match_context = {name: match_context}

        yield (match_text, uuid, template, match_context)


def list_figures(markdown_text):
    '''
    Given a block of markdown text,
    Yield each embedded figure and the matching text
    '''

    markdown_text = str(markdown_text)

    for match in reference_templates['figure']['regex'].finditer(markdown_text):
        match_text = markdown_text[match.span()[0]:match.span()[-1]]
        groups = match.groupdict()
        uuid = groups.get('id', '')
        size = groups.get('size', 100)
        caption = groups.get('caption', '')
        if uuid is not None:
            yield {
                'id': uuid.lower(),
                'size': size,
                'caption': caption
            }



user_template_regex = re.compile(r'{ {0,2}(?P<keyword>[a-zA-Z\.]{3,30}) {0,2}}')
def user_template_replace(markdown_text, context):
    '''
    Finds and replaces predefined keywords in markdown data
    '''

    user_context = {}

    # engagement
    engagement = context.get('engagement', '')
    if engagement:
        user_context['engagement'] = engagement.name

    # customer
    company_keywords = ('customer', 'client', 'company', '')
    if engagement:
        customer = context.get('engagement').customer
    else:
        from writehat.lib.customer import Customer
        customer = Customer(
            name='Arasaka Corporation',
            shortName='Arasaka',
            domain='ARASAKA.LOCAL',
            website='https://www.arasaka.fnet',
            address='123 Corpo Plaza, Night City CA 90077',
            POC='Sasai Arasaka',
            email='sasai@arasaka.fnet',
            phone='777-777-7777'
        )
    if customer:
        for k in company_keywords:
            if k:
                user_context[k] = customer.name
                user_context[f'{k}long'] = customer.name
                user_context[f'{k}short'] = customer.shortName
            user_context[f'{k}name'] = customer.name
            user_context[f'{k}longname'] = customer.name
            user_context[f'{k}shortname'] = customer.shortName
            user_context[f'{k}domain'] = customer.domain
            user_context[f'{k}website'] = customer.website
            user_context[f'{k}address'] = customer.address
            user_context[f'{k}email'] = customer.email
            user_context[f'{k}POC'] = customer.POC
            user_context[f'{k}contact'] = customer.POC
            user_context[f'{k}phone'] = customer.phone

    # report
    report = context.get('report', '')
    if report:
        user_context['report'] = report.name

    new_markdown_text = str(markdown_text)
    for match in user_template_regex.finditer(markdown_text):
        keyword = dict(match.groupdict()).get('keyword', '').lower().replace('.', '')
        value = user_context.get(keyword, '')
        if keyword:
            match_text = markdown_text[match.span()[0]:match.span()[-1]]
            new_markdown_text = new_markdown_text.replace(match_text, value)

    return new_markdown_text




def render_markdown(markdown_text, context=None):

    if not context:
        context = {}

    # handle engagement-specific cases if this is an engagement report
    report = context.get('report', '')
    try:
        report.engagement
        engagement = True
    except AttributeError:
        engagement = False

    valid_findings = {}
    
    if report and engagement:
        valid_findings = {str(f.id).lower(): f for f in report.findings}

    temp_placeholders = []
    for name, kwargs in reference_templates.items():
        for match_text, uuid, template, ref_context in match_references(markdown_text, name, context, **kwargs):

            # skip findings if it's not an engagement report
            # or if they're not in the allowed list
            if name == 'finding':
                if engagement and uuid in valid_findings:
                    for finding in report.findings:
                        if uuid == str(finding.id).lower():
                            ref_context['finding'] = finding
                else:
                    continue

            # populate component.index
            elif name == 'component':
                for component in report.flattened_components:
                    if str(component.id).lower() == uuid:
                        ref_context['component'].index = component.index

            if not uuid:
                markdown_text = str(markdown_text).replace(match_text, '')

            else:
                rendered_obj = render_to_string(template, ref_context)

                render_placeholder = f'0000{uuid}0000'
                markdown_text = str(markdown_text).replace(match_text, render_placeholder)
                temp_placeholders.append((render_placeholder, rendered_obj))

    # replace user-defined variables
    markdown_text = user_template_replace(markdown_text, context)

    rendered = md.markdown(markdown_text, extensions=['extra', 'nl2br', 'sane_lists'])
    cleaned = bleach.clean(rendered, tags=markdown_tags, attributes=markdown_attrs)

    for render_placeholder, rendered_obj in temp_placeholders:
        cleaned = cleaned.replace(render_placeholder, rendered_obj)

    return cleaned