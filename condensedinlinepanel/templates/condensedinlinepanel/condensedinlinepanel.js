(function() {
    CondensedInlinePanel.init('id_{{ self.formset.prefix }}', {
        canOrder: {{ self.formset.can_order|lower }},
    });
})();
