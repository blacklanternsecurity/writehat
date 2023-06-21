import re
import uuid
import bleach
import logging
import importlib
import markdown as md
from writehat.lib.cvss import *
from writehat.lib.dread import *
from markdown.extensions.codehilite import CodeHiliteExtension
from django.template.loader import render_to_string


log = logging.getLogger(__name__)

def getFootnote(context, *args, **kwargs):
    class Footnote:
        id = uuid.uuid4()

    return Footnote()

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
    'footnote': {
        'constructor': getFootnote,
        'template': 'reportTemplates/footnote.html',
        'regex': re.compile(
            r'{ {0,2}footnote\|(?P<footnote_text>[^|{}]{0,1024}) {0,2}}'
        ),
        'allowed_fields': ('footnote_text',),
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
    'hl': ['purple', 'pink', 'red', 'orange', 'yellow', 'green', 'blue', 'gray', 'mono'], # custom color highlights
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
        obj = None
        if constructor is not None:
            if uuid:
                try:
                    obj = constructor(id=uuid)
                except Exception as e:
                    log.error(e)
                match_context.update({name: obj})
            else:
                try:
                    obj = constructor(context)
                except Exception as e:
                    log.error(e)
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

user_template_regex = re.compile(r'{ {0,2}(?P<keyword>[a-zA-Z0-9\.]{3,60}) {0,2}}')
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

    # https://github.com/blacklanternsecurity/writehat/issues/67
    # total per severity plus the ability to scope this to finding group
    # or finding type

    # variables for user_context dict

    f,c,d,p,fg = "findings", "cvss", "dread", "proactive", "group"
    
    cvss = {
            "informational":0,
            "low": 0,
            "medium":0,
            "high":0,
            "critical":0,
            "total":0
            }

    dread = {
            "informational":0,
            "low": 0,
            "medium":0,
            "high":0,
            "critical":0,
            "total":0
            }

    proactive = 0
 
    findingGroups = set()
    for finding in report.findings:
        findingGroups.add(finding.findingGroup)

    fg_id = len(findingGroups)
    for fgroup in findingGroups:
        total, informational, low, medium, high, critical = 0,0,0,0,0,0
        for finding in report.findings:
            if finding.findingGroup == fgroup:
                if finding.scoringType == "CVSS":
                    cvss['total']+=1
                    total+=1
                    res = CVSS(finding.vector)
                    if res.severity == "Informational":
                        cvss['informational']+=1
                        informational+=1
                    elif res.severity == "Low":
                        cvss['low']+=1
                        low+=1
                    elif res.severity == "Medium":
                        cvss['medium']+=1
                        medium+=1
                    elif res.severity == "High":
                        cvss['high']+=1
                        high+=1
                    else:
                        cvss['critical']+=1
                        critical+=1
                elif finding.scoringType == "DREAD":
                    dread['total']+=1
                    total+=1
                    res = DREAD(finding.vector)
                    if res.severity == "Informational":
                        dread['informational']+=1
                        informational+=1
                    elif res.severity == "Low":
                        dread['low']+=1
                        low+=1
                    elif res.severity == "Medium":
                        dread['medium']+=1
                        medium+=1
                    elif res.severity == "High":
                        dread['high']+=1
                        high+=1
                    else:
                        dread['critical']+=1
                        critical+=1
                else:
                    total+=1
                    proactive+=1

        # total per category
        user_context[f'{f}{fg}{fg_id}totalcount'] = total
        user_context[f'{f}{fg}{fg_id}informationalcount'] = informational
        user_context[f'{f}{fg}{fg_id}lowcount'] = low
        user_context[f'{f}{fg}{fg_id}mediumcount'] = medium
        user_context[f'{f}{fg}{fg_id}highcount'] = high
        user_context[f'{f}{fg}{fg_id}criticalcount'] = critical
        fg_id-=1

    # total per severity 
    user_context[f'{f}informationalcount'] = cvss['informational'] + dread['informational']
    user_context[f'{f}lowcount'] = cvss['low'] + dread['low']
    user_context[f'{f}mediumcount'] = cvss['medium'] + dread['medium']
    user_context[f'{f}highcount'] = cvss['high'] + dread['high']
    user_context[f'{f}criticalcount'] = cvss['critical'] + dread['critical']
    user_context[f'{f}totalcount'] = (user_context[f'{f}informationalcount'] + 
                                         user_context[f'{f}lowcount'] + 
                                         user_context[f'{f}mediumcount'] + 
                                         user_context[f'{f}highcount'] + 
                                         user_context[f'{f}criticalcount'])

    # cvss
    user_context[f'{f}{c}totalcount'] = cvss['total']
    user_context[f'{f}{c}informationalcount'] = cvss['informational']
    user_context[f'{f}{c}lowcount'] = cvss['low']
    user_context[f'{f}{c}mediumcount'] = cvss['medium']
    user_context[f'{f}{c}highcount'] = cvss['high']
    user_context[f'{f}{c}criticalcount'] = cvss['critical']

    # dread
    user_context[f'{f}{d}totalcount'] = dread['total']
    user_context[f'{f}{d}informationalcount'] = dread['informational']
    user_context[f'{f}{d}lowcount'] = dread['low']
    user_context[f'{f}{d}mediumcount'] = dread['medium']
    user_context[f'{f}{d}highcount'] = dread['high']
    user_context[f'{f}{d}criticalcount'] = dread['critical']

    # proactive 
    user_context[f'{f}{p}totalcount'] = proactive

    new_markdown_text = str(markdown_text)
    
    for match in user_template_regex.finditer(markdown_text):
        keyword = dict(match.groupdict()).get('keyword', '').lower().replace('.', '')
        value = user_context.get(keyword, '')
        if keyword:
            if value == '':
                value = ''
            match_text = markdown_text[match.span()[0]:match.span()[-1]]
            new_markdown_text = new_markdown_text.replace(match_text, str(value))

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

    codehilite_ext = CodeHiliteExtension(use_pygments=False)

    rendered = md.markdown(markdown_text, extensions=['extra', 'nl2br', 'sane_lists', codehilite_ext])
    cleaned = bleach.clean(rendered, tags=markdown_tags, attributes=markdown_attrs)

    for render_placeholder, rendered_obj in temp_placeholders:
        cleaned = cleaned.replace(render_placeholder, rendered_obj)

    return cleaned
