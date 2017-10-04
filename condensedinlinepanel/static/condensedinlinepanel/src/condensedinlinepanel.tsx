import {createStore} from 'redux';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {Form} from './types';
import {reducer, State, emptyState} from './state';
import {DraggableCard, renderCardHeaderFn} from './components/Card';
import {DNDCardSet} from './components/CardSet';

// Need to import scss here so Webpack will find it. This will be exported as a separate css file
import './condensedinlinepanel.scss';

export {DraggableCard as Card, DNDCardSet as CardSet, reducer};

interface Options {
    canEdit?: boolean,
    canDelete?: boolean,
    canOrder?: boolean,
    renderCardHeader?: renderCardHeaderFn,
    panelLabel?: string,
}

function renderCardHeaderDefault(form: Form) {
    return {
        __html: '',
    }
}

export function init(id: string, options: Options = {}) {
    const canEdit = options['canEdit'] || true;
    const canDelete = options['canDelete'] || canEdit;
    const canOrder = options['canOrder'] || false;
    const renderCardHeader = options['renderCardHeader'] || renderCardHeaderDefault;
    const panelLabel = options['panelLabel'] || "Add";

    let element = document.getElementById(id);
    if (element === null) {
        console.error(`CondensedInlinePanel.init(): Element with id '${id}' does not exist.`)
        return;
    }

    let totalFormsField = document.getElementById(id + '-TOTAL_FORMS');
    let dataField = element.getElementsByClassName('condensed-inline-panel__data')[0];
    let sortOrderField = element.getElementsByClassName('condensed-inline-panel__sort-order')[0];
    let uiContainer = element.getElementsByClassName('condensed-inline-panel__ui-container')[0];

    let store = createStore(reducer);

    let sortCompareFunc = (a: Form, b: Form) => {
        if (a.position > b.position) {
            return 1;
        } else if (a.position < b.position) {
            return -1;
        } else {
            return 0;
        }
    };

    // Rerender component when state changes
    store.subscribe(() => {
        if (element === null) {
            return;
        }

        let state = store.getState() || emptyState();
        ReactDOM.render(<DNDCardSet forms={state.forms}
                                 panelLabel={panelLabel}
                                 renderCardHeader={renderCardHeader}
                                 canEdit={canEdit}
                                 canDelete={canDelete}
                                 canOrder={canOrder}
                                 store={store}
                                 emptyForm={state.emptyForm}
                                 formTemplate={element.dataset['formTemplate']||''}
                                 formsetPrefix={id}
                                 sortCompareFunc={sortCompareFunc} />, uiContainer);
    });

    // Keep sort order field up to date
    if (canOrder) {
        let sortOrderField = element.getElementsByClassName('condensed-inline-panel__sort-order')[0];
        store.subscribe(() => {
            let state = store.getState() || emptyState();
            let sortOrders = [];

            for (let i = 0; i< state.forms.length; i++) {
                sortOrders.push(state.forms[i].position);
            }

            if (sortOrderField instanceof HTMLInputElement) {
                sortOrderField.value = JSON.stringify(sortOrders);
            }
        });
    }

    // Keep delete field up to date
    let deleteField = element.getElementsByClassName('condensed-inline-panel__delete')[0];
    store.subscribe(() => {
        let state = store.getState() || emptyState();
        let deletedForms = [];

        for (let i = 0; i< state.forms.length; i++) {
            if (state.forms[i].isDeleted) {
                deletedForms.push(state.forms[i].id);
            }
        }

        if (deleteField instanceof HTMLInputElement) {
            deleteField.value = JSON.stringify(deletedForms);
        }
    });

    // Set initial state
    if (dataField instanceof HTMLInputElement) {
        store.dispatch({
            type: 'SET_STATE',
            state: JSON.parse(dataField.value),
        });
    }

    // Update TOTAL_FORMS when the number of forms changes
    store.subscribe(() => {
        let state = store.getState() || emptyState();

        if (totalFormsField instanceof HTMLInputElement) {
            totalFormsField.value = state.forms.length.toString();
        }
    });
}
