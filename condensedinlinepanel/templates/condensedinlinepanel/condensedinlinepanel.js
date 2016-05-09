(function() {
    CondensedInlinePanel.init('id_{{ self.formset.prefix }}', {
        summaryTextField: '{{ self.formset.summary_text_field|escapejs }}',
        canOrder: {{ self.formset.can_order|lower }},
    });
})();
