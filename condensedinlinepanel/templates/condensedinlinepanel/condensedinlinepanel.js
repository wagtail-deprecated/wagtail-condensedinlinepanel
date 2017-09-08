(function() {
    CondensedInlinePanel.init('id_{{ self.formset.prefix }}', {
        summaryTextField: '{{ self.formset.summary_text_field|escapejs }}',
        canOrder: {{ self.formset.can_order|lower }},
        panelLabel: "{{ self.label }}",
        renderCardHeader: function(form) {
            {% if self.card_header_from_field %}
                {# Get the card header value from a field and escape it #}
                var value = form.fields['{{ self.card_header_from_field|escapejs }}'];
                if (form.isNew){
                  value = "{{ self.new_card_header }}";
                }
                var needsEscaping = true;
            {% elif self.card_header_from_js %}
                {# The card_header_from_js field is set by a developer so we can assume it's safe #}
                var value = eval('{{ self.card_header_from_js|escapejs }}');
                var needsEscaping = true;
            {% elif self.card_header_from_js_safe %}
                {# Same as card_header_from_js but without HTML escaping #}
                var value = eval('{{ self.card_header_from_js_safe|escapejs }}');
                var needsEscaping = false;
            {% else %}
                {# Developer forgot to set this #}
                if (form.instanceAsStr===undefined){
                  var value = "{{ self.new_card_header }}";
                } else {
                  var value = form.instanceAsStr;
                }
                var needsEscaping = true;
            {% endif %}

            if (value==null){
                value = "";
                needsEscaping = false;
            }

            value = value.toString();

            if (needsEscaping) {
                value = value
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            return {
                __html: value,
            };
        }
    });
})();
