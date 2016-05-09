import json
import django
from django.template.loader import render_to_string

from modelcluster.forms import BaseChildFormSet

from wagtail.wagtailadmin.edit_handlers import BaseInlinePanel


class BaseCondensedInlinePanelFormSet(BaseChildFormSet):
    """
    A special formset class that stores all of its data in a single JSON-formatted
    field.
    """
    def process_post_data(self, data, *args, **kwargs):
        """
        Called when initialising the formset with POST data. This method unpacks
        the source JSON blob so forms that were not changed (so didn't get submitted)
        don't appear to Django to be missing.

        We also have a separate field that contains the orderings of each form
        that's processed here.
        """
        prefix = kwargs['prefix']
        new_data = data.copy()

        if prefix in new_data:
            data_json = json.loads(new_data[prefix])

            for form_id, form in enumerate(data_json['forms']):
                for field_name, field_value in form['fields'].items():
                    new_data.setdefault(prefix + '-' + str(form_id) + '-' + field_name, field_value)

            delete_json = json.loads(new_data[prefix + '-DELETE'])
            for form_id in delete_json:
                new_data[prefix + '-' + str(form_id) + '-DELETE'] = 'on'

            if self.can_order:
                order_json = json.loads(new_data[prefix + '-ORDER'])
                for form_id, form_order in enumerate(order_json):
                    new_data[prefix + '-' + str(form_id) + '-ORDER'] = form_order

        return new_data

    def __init__(self, data, *args, **kwargs):
        if data is not None:
            data = self.process_post_data(data, *args, **kwargs)
        super(BaseCondensedInlinePanelFormSet, self).__init__(data, *args, **kwargs)

        # TODO: Make this configurable
        self.summary_text_field = 'name'

    def to_json(self):
        def get_form_extra_data(form):
            """
            Some components require a bit of extra data in order to render properly.

            For example, the choosers need to know the name of the thing they
            have been linked to (while the field value is just the ID).

            This function returns this extra data for a particular form in a mapping
            of field names => values.
            """
            data = {}

            # TODO: Make this automatic
            link_page = form.instance.link

            if link_page:
                return {
                    'link': {
                        'title': link_page.title,
                    }
                }
            else:
                return {}

        return json.dumps({
            'forms': [
                {
                    'id': i,
                    'fields': {
                        field_name: form[field_name].value()
                        for field_name in form.fields.keys()
                    },
                    'extra': get_form_extra_data(form),
                    'errors': json.loads(form.errors.as_json()),
                    'position': i,
                }
                for i, form in enumerate(self)
            ],
            'emptyForm': {
                'fields': {
                    field_name: self.empty_form[field_name].value()
                    for field_name in self.empty_form.fields.keys()
                }
            }
        })


class BaseCondensedInlinePanel(BaseInlinePanel):
    template = 'condensedinlinepanel/condensedinlinepanel.html'
    js_template = 'condensedinlinepanel/condensedinlinepanel.js'
    formset_class = BaseCondensedInlinePanelFormSet

    @classmethod
    def required_formsets(cls):
        child_edit_handler_class = cls.get_child_edit_handler_class()

        return {
            cls.relation_name: {
                'formset': cls.formset_class,
                'fields': child_edit_handler_class.required_fields(),
                'widgets': child_edit_handler_class.widget_overrides(),
                'min_num': cls.min_num,
                'validate_min': cls.min_num is not None,
                'max_num': cls.max_num,
                'validate_max': cls.max_num is not None
            }
        }


class CondensedInlinePanel(object):
    def __init__(self, relation_name, panels=None, label='', help_text='', min_num=None, max_num=None):
        self.relation_name = relation_name
        self.panels = panels
        self.label = label
        self.help_text = help_text
        self.min_num = min_num
        self.max_num = max_num

    def bind_to_model(self, model):
        if django.VERSION >= (1, 9):
            related = getattr(model, self.relation_name).rel
        else:
            related = getattr(model, self.relation_name).related

        return type(str('_CondensedInlinePanel'), (BaseCondensedInlinePanel,), {
            'model': model,
            'relation_name': self.relation_name,
            'related': related,
            'panels': self.panels,
            'heading': self.label,
            'help_text': self.help_text,
            # TODO: can we pick this out of the foreign key definition as an alternative?
            # (with a bit of help from the inlineformset object, as we do for label/heading)
            'min_num': self.min_num,
            'max_num': self.max_num
        })
