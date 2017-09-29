from __future__ import absolute_import, unicode_literals
import six

import json
import django
from django import forms
from django.utils.translation import ugettext_lazy as _

from modelcluster.forms import BaseChildFormSet

from wagtail.wagtailadmin.edit_handlers import BaseInlinePanel
from wagtail.wagtailcore.models import Page
from wagtail.wagtailimages.models import AbstractImage
from wagtail.wagtaildocs.models import Document


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

    def to_json(self):
        def get_form_extra_data(form):
            """
            Some components require a bit of extra data in order to render properly.

            For example, the choosers need to know the name of the thing they
            have been linked to (while the field value is just the ID).

            This function returns this extra data for a particular form in a mapping
            of field names => values.
            """
            if not form.instance:
                return {}

            data = {}

            # Find choosers
            for bound_field in form:
                field_name = bound_field.name
                field = bound_field.field
                value = bound_field.value()

                if isinstance(field.widget, forms.HiddenInput):
                    continue

                if isinstance(field, forms.ModelChoiceField):
                    model = field.queryset.model
                    obj = model.objects.filter(pk=value).first()

                    if obj is not None:
                        if issubclass(model, Page):
                            data[field_name] = {
                                'title': obj.title
                            }
                        elif issubclass(model, AbstractImage):
                            rendition = obj.get_rendition('max-130x130')
                            data[field_name] = {
                                'title': obj.title,
                                'preview_image': {
                                    'src': rendition.url,
                                    'alt': rendition.alt,
                                    'width': rendition.width,
                                    'height': rendition.height,
                                }
                            }
                        elif issubclass(model, Document):
                            data[field_name] = {
                                'title': obj.title
                            }

            return data

        return json.dumps({
            'forms': [
                {
                    'id': i,
                    'instanceAsStr': six.text_type(form.instance),
                    'fields': {
                        field_name: form[field_name].value()
                        for field_name in form.fields.keys()
                    },
                    'extra': get_form_extra_data(form),
                    'errors': json.loads(form.errors.as_json()),
                    'position': i + 1,

                    # #19 - Force the form to render its fields if it's not saved
                    # (As it doesn't have an object in the database, it needs to be
                    # recreated on every form submission)
                    'forceFormRender': form.instance.id is None,
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

    def __init__(self, *args, **kwargs):
        super(BaseCondensedInlinePanel, self).__init__(*args, **kwargs)
        self.formset.to_json()

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
    def __init__(self, relation_name, panels=None, heading='', label='', help_text='', min_num=None, max_num=None, card_header_from_field=None, card_header_from_js=None, card_header_from_js_safe=None, new_card_header_text=""):
        self.relation_name = relation_name
        self.panels = panels
        # TODO: label is used below for backwards compatibility. We may want to rethink this later.
        self.heading = heading or label
        self.label = label
        self.help_text = help_text
        self.min_num = min_num
        self.max_num = max_num
        self.card_header_from_field = card_header_from_field
        self.card_header_from_js = card_header_from_js
        self.card_header_from_js_safe = card_header_from_js_safe
        self.new_card_header_text = new_card_header_text

    def bind_to_model(self, model):
        if django.VERSION >= (1, 9):
            related = getattr(model, self.relation_name).rel
        else:
            related = getattr(model, self.relation_name).related

        related_name = {
            'related_verbose_name': related.related_model._meta.verbose_name,
            'related_verbose_name_plural': related.related_model._meta.verbose_name_plural
        }
        heading = self.heading or _('%(related_verbose_name_plural)s') % related_name
        new_card_header = self.new_card_header_text or _('New %(related_verbose_name)s') % related_name
        label = self.label or _('Add %(related_verbose_name)s') % related_name

        return type(str('_CondensedInlinePanel'), (BaseCondensedInlinePanel,), {
            'model': model,
            'relation_name': self.relation_name,
            'related': related,
            'panels': self.panels,
            'heading': heading,
            'new_card_header': new_card_header,
            'label': label,
            'help_text': self.help_text,
            # TODO: can we pick this out of the foreign key definition as an alternative?
            # (with a bit of help from the inlineformset object, as we do for label/heading)
            'min_num': self.min_num,
            'max_num': self.max_num,
            'card_header_from_field': self.card_header_from_field,
            'card_header_from_js': self.card_header_from_js,
            'card_header_from_js_safe': self.card_header_from_js_safe,
        })
