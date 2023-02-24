![WriteHat](https://user-images.githubusercontent.com/20261699/99591040-3aadef00-29bc-11eb-9307-186084e8b7c9.png)
**WriteHat** is a reporting tool which removes Microsoft Word (and many hours of suffering) from the reporting process.  **Markdown** --> **HTML** --> **PDF**.  Created by penetration testers, for penetration testers - but can be used to generate any kind of report.  Written in Django (Python 3).




## Features:
- **Effortlessly generate beautiful pentest reports**
- **On-the-fly drag-and-drop report builder**
- **Markdown support - including code blocks, tables, etc.**
- **Crop, annotate, caption, and upload images**
- **Customizable report background / footer**
- **Assign operators and track statuses for individual report sections**
- **Ability to clone and template reports**
- **Findings database**
- **Supports multiple scoring types (CVSS 3.1, DREAD)**
- **Can easily generate multiple reports from the same set of findings**
- **Extensible design enables power users to craft highly-customized report sections**
- **LDAP integration**


![writehat_report](https://user-images.githubusercontent.com/20261699/100153074-a0ddba80-2e71-11eb-9975-c61c6c8c818d.png)


## Installation Prerequisites:

- Install `docker` and `docker-compose` 
    - These can usually be installed using `apt`, `pacman`, `dnf`, etc.
    ~~~
    $ sudo apt install docker.io docker-compose
    ~~~


## Deploying WriteHat (The quick and easy way, for testing):

WriteHat can be deployed in a single command:
~~~
$ git clone https://github.com/blacklanternsecurity/writehat && cd writehat && docker-compose up
~~~
Log in at **https://127.0.0.1** (default: **`admin`** / **`PLEASECHANGETHISFORHEAVENSSAKE`**)


## Deploying WriteHat (The right way):

1. **Install Docker and Docker Compose**
1. **Clone the WriteHat Repo** into `/opt`
    ~~~
    $ cd /opt
    $ git clone https://github.com/blacklanternsecurity/writehat
    $ cd writehat
    ~~~
1. **Create Secure Passwords** in `writehat/config/writehat.conf` for:
    - MongoDB (also enter in `docker-compose.yml`)
    - MySQL (also enter in `docker-compose.yml`)
    - Django (used for encrypting cookies, etc.)
    - Admin user
Note: Nothing else aside from the passwords need to be modified if you are using the default configuration
Note: Don't forget to lock down the permissions on `writehat/config/writehat.conf` and `docker-compose.yml`: (`chown root:root; chmod 600`)
1. **Add Your Desired Hostname** to `allowed_hosts` in `writehat/config/writehat.conf`
1. (Optional) **Replace the self-signed SSL certificates** in `nginx/`:
    - `writehat.crt`
    - `writehat.key`
1. **Test That Everything's Working**:
    ~~~
    $ docker-compose up --build
    ~~~
    Note: If using a VPN, you need to be disconnected from the VPN the first time you run bring up the services with `docker-compose`.  This is so docker can successfully create the virtual network.
1. **Install and Activate the Systemd Service**:

    This will start WriteHat automatically upon boot
    ~~~
    $ sudo cp writehat/config/writehat.service /etc/systemd/system/
    $ sudo systemctl enable writehat --now
    ~~~
1. **Tail the Service Logs**:
    ~~~
    $ sudo journalctl -xefu writehat.service
    ~~~
1. **Create Users**

    Browse to https://127.0.0.1/admin after logging in with the admin user specified in `writehat/config/writehat.conf`
    Note: There are some actions which only an admin can perform (e.g. database backups)  An admin user is automatically created from the username and password in `writehat/config/writehat.conf`, but you can also promote an LDAP user to admin:
    ~~~
    # Enter the app container
    $ docker-compose exec writehat bash

    # Promote the user and exit
    $ ./manage.py ldap_promote <ldap_username>
    $ exit
    ~~~


## Terminology
Here are basic explanations for some **WriteHat** terms which may not be obvious.
~~~
Engagement
 ├─ Customer
 ├─ Finding Group 1
 │   ├─ Finding
 │   └─ Finding
 ├─ Finding Group 2
 │   ├─ Finding
 │   └─ Finding
 ├─ Report 1
 └─ Report 2
     └─ Page Template
~~~

### Engagement
An **Engagement** is where content is created for the customer.  This is where the work happens - creating reports and entering findings.

### Report
A **Report** is a modular, hierarchical arrangement of **Components** which can be easily updated via a drag-and-drop interface, then rendered into HTML or PDF.  An engagement can have multiple **Reports**.  A **Page Template** can be used to customize the background and footer.  A **Report** can also be converted into a **Report Template**.

### Report Component
A report **Component** is a section or module of the report that can be dragged/dropped into place inside the report creator.  Examples include "Title Page", "Markdown", "Findings", etc.  There are plenty of built-in components, but you can make your own as well.  (They're just HTML/CSS + Python, so it's pretty easy.  See the guide below)

### Report Template
A **Report Template** can be used as a starting point for a **Report** (in an **Engagement**).  **Reports** can also be converted to **Report Templates**.

### Finding Group
A **Finding Group** is a collection of findings that are scored in the same way (e.g. CVSS or DREAD).  You can create multiple finding groups per engagement (e.g. "Technical Findings" and "Treasury Findings").  When inserting the findings into the **Report** (via the "Findings" **Component**, for example), you need to select which **Finding Group** you want to populate that **Component**.

### Page Template
A **Page Template** lets you customize report background images and footers.  You can set one **Page Template** as the default, and it will be applied globally unless overridden at the **Engagement** or **Report** level.

## Markdown placeholders
You can automatically insert client-specific information such as the client name, URL, e-mail, etc. in your reports, by inserting
`{Client<field>}` in the text. This is particularly useful for report templates.

For example, if you want to refer to the client in your executive summary, you can insert `{ClientName}` in the text. For a specific
list of fields you can insert, or to insert more, refer to [the markdown.py file](writehat/lib/markdown.py)


## Writing Custom Report Components

![report_creation](https://user-images.githubusercontent.com/20261699/98385967-a20f8a80-201d-11eb-91c4-69b361dde132.gif)
Each report component is made up of the following:
1. A Python file in `writehat/components/`
2. An HTML template in `writehat/templates/componentTemplates/`
3. A CSS file in `writehat/static/css/component/` (optional)

We recommend referencing the existing files in these directories; they work well as starting points / examples.

A simple custom component would look like this:

### `components/CustomComponent.py`:
~~~
from .base import *

class CustomComponentForm(ComponentForm):

    summary = forms.CharField(label='Component Text', widget=forms.Textarea, max_length=50000, required=False)
    field_order = ['name', 'summary', 'pageBreakBefore', 'showTitle']


class Component(BaseComponent):

    default_name = 'Custom Report Component'
    formClass = CustomComponentForm

    # the "templatable" attribute decides whether or not that field
    # gets saved if the report is ever converted into a template
    fieldList = {
        'summary': StringField(markdown=True, templatable=True),
    }

    # make sure to specify the HTML template
    htmlTemplate = 'componentTemplates/CustomComponent.html'

    # Font Awesome icon type + color (HTML/CSS)
    # This is just eye candy in the web app
    iconType = 'fas fa-stream'
    iconColor = 'var(--blue)'

    # the "preprocess" function is executed when the report is rendered
    # use this to perform any last-minute operations on its data
    def preprocess(self, context):

        # for example, to uppercase the entire "summary" field:
        #   context['summary'] = context['summary'].upper()
        return context
~~~
Note that fields *must* share the same name in both the component class and its form.  All components must either inherit from `BaseComponent` or another component.  Additionally, each component has built-in fields for `name`, `pageBreakBefore` (whether to start on a new page), and `showTitle` (whether or not to display the `name` field as a header).  So it's not necessary to add those.

### `componentTemplates/CustomComponent.html`:

Fields from the Python module are automatically added to the template context.  In this example, we want to render the `summary` field as markdown, so we add the `markdown` tag in front of it.  Note that you can also access engagement and report-level variables, such as `report.name`, `report.findings`, `engagement.customer.name`, etc.
~~~
{% load custom_tags %}
<section class="l{{ level }} component{% if pageBreakBefore %} page-break{% endif %}" id="container_{{ id }}">
  {% include 'componentTemplates/Heading.html' %}
  <div class='markdown-align-justify custom-component-summary'>
    <p>
      {% markdown summary %}
    </p>
  </div>
</section>
~~~

### `componentTemplates/CustomComponent.css` (optional):

The filename must match that of the Python file (but with a `.css` extension instead of `.py`).  It is loaded automatically when the report is rendered.
~~~
div.custom-component-summary {
    font-weight: bold;
}
~~~
Once the above files are created, simply restart the web app and it the new component will populate automatically.
~~~
$ docker-compose restart writehat
~~~


## Manual DB Update/Migration
If an update is pushed that changes the database schema, Django database migrations are executed automatically when the container is restarted.  However, user interaction may sometimes be required.
To apply Django migrations manually:
1. Stop WriteHat (`systemctl stop writehat`)
2. cd into the WriteHat directory (`/opt/writehat`)
3. Start the docker container
~~~
$ docker-compose run writehat bash
~~~
4. Once in the container, apply the migrations as usual:
~~~
$ ./manage.py makemigrations
$ ./manage.py migrate
$ exit
~~~
5. Bring down the docker containers and restart the service
~~~
$ docker-compose down
$ systemctl start writehat
~~~


## Manual DB Backup/Restore
Note that there is already in-app functionality for this in the `/admin` page of the web app.  You can use this method if you want to make a file-level backup job via `cron`, etc.
1. On the destination system:
    - Follow normal installation steps
    - Stop WriteHat (`systemctl stop writehat`)
2. On the source system:
    - Stop WriteHat (`systemctl stop writehat`)
3. TAR up the `mysql`, `mongo`, and `writehat/migrations` directories and copy the archive to the destination system (same location):
~~~
# MUST RUN AS ROOT
$ sudo tar --same-owner -cvzpf db_backup.tar.gz mongo mysql writehat/migrations
~~~
4. On the destination system, make a backup of the `migrations` directory
~~~
$ mv writehat/migrations writehat/migrations.bak
~~~
5. Extract the TAR archive on the destination
~~~
$ sudo tar --same-owner -xvpzf db_backup.tar.gz
~~~
6. Start WriteHat on the new system
~~~
$ systemctl start writehat
~~~


## Roadmap / *Potential* Future Developments:
- Change tracking and revisions
- More in-depth review/feedback functionality
- Collaborative multi-user editing similar to Google Docs
- JSON export feature
- Presentation slide generation
- More advanced table creator with CSV upload feature
- More granular permissions / ACLs (beyond just user + admin roles)

## Starting afresh
WriteHat stores your instance's data in the `/mongo` and `/mysql` directories. The easiest way to start from
scratch is to run `git clean -f -d`.


## Known Bugs / Limitations:
- Chrome or Chromium is the recommended browser.  Others are untested and may experience bugs.
- "Assignee" field on report components only works with LDAP users, not local ones.
- Annotations on images sometimes jump slightly when applied.  It's a known bug that we're tracking with the JS library:
https://github.com/ailon/markerjs/issues/40
- Visual bugs appear occasionally on page breaks.  These can be fixed by manually inserting a page break in the affected markdown (there's a button for it in the editor).