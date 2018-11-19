import datetime
import json
import six

from django import forms
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.translation import ugettext_lazy as _

from modelcluster.forms import BaseChildFormSet

from wagtail.admin.edit_handlers import InlinePanel
from wagtail.admin.widgets import DEFAULT_DATE_FORMAT, DEFAULT_DATETIME_FORMAT
from wagtail.core.blocks import StreamValue
from wagtail.core.models import Page
from wagtail.images.models import AbstractImage
from wagtail.images.shortcuts import get_rendition_or_not_found
from wagtail.documents.models import Document


class WagtailJSONEncoder(DjangoJSONEncoder):
    def default(self, o):
        # Don't include seconds in times
        if isinstance(o, datetime.datetime):
            fmt = getattr(settings, 'WAGTAIL_DATETIME_FORMAT', DEFAULT_DATETIME_FORMAT)
            return o.strftime(fmt)
        if isinstance(o, datetime.date):
            fmt = getattr(settings, 'WAGTAIL_DATE_FORMAT', DEFAULT_DATE_FORMAT)
            return o.strftime(fmt)
        elif isinstance(o, datetime.time):
            return o.strftime('%H:%M')
        elif isinstance(o, StreamValue):
            return o.stream_block.get_prep_value(o)
        else:
            return super().default(o)


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
                # For forms that weren't expanded, add their data to the request manually.
                # Note: Even though we're using setdefault, we need to check that the form
                # was submitted so checkbox fields can be unchecked (because they don't
                # submit anything in their unchecked state, setdefault may inadvertantly
                # recheck them)
                if prefix + '-' + str(form_id) + '-id' not in new_data:
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
        super().__init__(data, *args, **kwargs)

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
                            rendition = get_rendition_or_not_found(obj, 'max-130x130')
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
                        else:
                            data[field_name] = {
                                'title': str(obj)
                            }

            return data

        return json.dumps({
            'forms': [
                {
                    'id': i,
                    'instanceAsStr': six.text_type(form.instance),
                    'fields': {
                        field_name: form[field_name].field.widget.format_value(form[field_name].value())
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
                    field_name: self.empty_form[field_name].field.widget.format_value(self.empty_form[field_name].value())
                    for field_name in self.empty_form.fields.keys()
                }
            }
        }, cls=WagtailJSONEncoder)


class CondensedInlinePanel(InlinePanel):
    template = 'condensedinlinepanel/condensedinlinepanel.html'
    js_template = 'condensedinlinepanel/condensedinlinepanel.js'
    formset_class = BaseCondensedInlinePanelFormSet

    def __init__(self,
                 relation_name,
                 panels=None,
                 heading='',
                 label='',
                 min_num=None,
                 max_num=None,
                 classname='',
                 card_header_from_field=None,
                 card_header_from_js=None,
                 card_header_from_js_safe=None,
                 new_card_header_text="",
                 *args, **kwargs):
        super().__init__(relation_name,
                         panels,
                         heading,
                         label,
                         min_num,
                         max_num,
                         classname,
                         *args, **kwargs)
        # self.formset.to_json()
        # TODO: label is used below for backwards compatibility. We may want to rethink this later.
        self.heading = heading or label
        self.card_header_from_field = card_header_from_field
        self.card_header_from_js = card_header_from_js
        self.card_header_from_js_safe = card_header_from_js_safe
        self.new_card_header_text = new_card_header_text

    def clone(self):
        new = super().clone()
        new.card_header_from_field = self.card_header_from_field
        new.card_header_from_js = self.card_header_from_js
        new.card_header_from_js_safe = self.card_header_from_js_safe
        new.new_card_header_text = self.new_card_header_text
        return new

    def required_formsets(self):
        formsets = super().required_formsets()
        formsets[self.relation_name]['formset'] = self.formset_class
        return formsets

    def on_instance_bound(self):
        super().on_instance_bound()
        related_name = {
            'related_verbose_name': self.db_field.related_model._meta.verbose_name,
            'related_verbose_name_plural': self.db_field.related_model._meta.verbose_name_plural
        }
        self.heading = self.heading or _('%(related_verbose_name_plural)s') % related_name
        self.new_card_header_text = self.new_card_header_text or _('New %(related_verbose_name)s') % related_name
        self.label = self.label or _('Add %(related_verbose_name)s') % related_name
