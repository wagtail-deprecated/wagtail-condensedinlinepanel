import django
from wagtail.core import hooks

if django.VERSION >= (3, 0):
    from django.templatetags.static import static
else:
    from django.contrib.staticfiles.templatetags.staticfiles import static


# JS/CSS for custom edit handlers

@hooks.register('insert_editor_js')
def editor_js():
    return '<script src="{0}"></script>'.format(static('condensedinlinepanel/dist/condensedinlinepanel.bundle.js'))


@hooks.register('insert_editor_css')
def editor_css():
    return '<link rel="stylesheet" href="{0}">'.format(static('condensedinlinepanel/dist/condensedinlinepanel.css'))
