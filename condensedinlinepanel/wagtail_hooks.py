from __future__ import absolute_import, unicode_literals

from django.contrib.staticfiles.templatetags.staticfiles import static

from wagtail.wagtailcore import hooks


# JS/CSS for custom edit handlers

@hooks.register('insert_editor_js')
def editor_js():
    return '<script src="{0}"></script>'.format(static('condensedinlinepanel/dist/condensedinlinepanel.bundle.js'))


@hooks.register('insert_editor_css')
def editor_css():
    return '<link rel="stylesheet" href="{0}">'.format(static('condensedinlinepanel/dist/condensedinlinepanel.css'))
