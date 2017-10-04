import {Store} from 'redux';
import * as React from 'react';
import {DragSource, DropTarget, DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import {Form} from '../types';
import {State} from '../state';
import {DraggableCard, customiseActionsFn, renderCardHeaderFn} from './Card';
import {DroppableGap, onDNDFn, onAddFn} from './Gap';

export interface CardSetProps {
    forms: Form[],
    sortCompareFunc: (a: Form, b: Form) => 1 | 0 | -1,
    store: Store<State | null | undefined>,
    dndKey?: string,
    formsetPrefix: string,
    panelLabel: string,
    renderCardHeader: renderCardHeaderFn,
    canEdit: boolean,
    canDelete: boolean,
    canOrder: boolean,
    formTemplate: string,
    customiseCardActions?: customiseActionsFn,
    onDND?: onDNDFn,
    emptyForm: Form,
}

export class CardSet extends React.Component<CardSetProps, {}> {
    initGaps(forms: any[], onDND: onDNDFn, onAdd: onAddFn) {
        /* Injects Gap components into an array of rendered cards */

        let positionId = 1;
        let newForms = [];

        // Add the top gap
        newForms.push(<DroppableGap key={'gap-' + positionId} position={positionId++} dndKey={this.props.dndKey||this.props.formsetPrefix} onDND={onDND} onAdd={onAdd} />);

        for (let i = 0; i < forms.length; i++) {
            newForms.push(forms[i]);

            // Add a gap
            newForms.push(<DroppableGap key={'gap-' + positionId} position={positionId++} dndKey={this.props.dndKey||this.props.formsetPrefix} onDND={onDND} onAdd={onAdd} />);
        }

        return newForms;
    }

    render() {
        let renderedCards = [];

        // Sort the forms by their SORT field
        let sortedForms = this.props.forms.slice();

        if (this.props.sortCompareFunc) {
            sortedForms.sort(this.props.sortCompareFunc);
        }

        for (let i in sortedForms) {
            let form = sortedForms[i];

            // Event handlers

            let onEditStart = (e: MouseEvent) => {
                /* Fired when the user clicks the "edit" button on the card */

                // Start editing the card
                let newForm: Form = (JSON.parse(JSON.stringify(form)));
                newForm.isEditing = true;
                newForm.hasChanged = true;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: newForm.id,
                    data: newForm,
                });

                e.preventDefault();
                return false;
            };

            let onDelete = (e: MouseEvent) => {
                /* Fired when the user clicks the "delete" button on the card */

                // Set "DELETE" field
                let newForm: Form = (JSON.parse(JSON.stringify(form)));
                newForm.isDeleted = true;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: newForm.id,
                    data: newForm,
                });

                e.preventDefault();
                return false;
            };

            let onEditClose = (e: MouseEvent, newFields: {[name: string]: string;}) => {
                /* Fired when the user clicks the "close" button in the form */

                // Save the form data
                let newForm: Form = (JSON.parse(JSON.stringify(form)));
                newForm.isEditing = false;
                newForm.fields = newFields;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: newForm.id,
                    data: newForm,
                });

                e.preventDefault();
                return false;
            };

            // Render the card component
            renderedCards.push(<DraggableCard key={form.id}
                                     form={form}
                                     renderCardHeader={this.props.renderCardHeader}
                                     canEdit={this.props.canEdit}
                                     canDelete={this.props.canDelete}
                                     canOrder={this.props.canOrder}
                                     template={this.props.formTemplate}
                                     formPrefix={`${this.props.formsetPrefix}-${form.id.toString()}`}
                                     customiseActions={this.props.customiseCardActions}
                                     dndKey={this.props.dndKey||this.props.formsetPrefix}
                                     onEditStart={onEditStart}
                                     onEditClose={onEditClose}
                                     onDelete={onDelete} />);
        }

        // The DND event handler

        let onDND = this.props.onDND || ((formId, position) => {
            /* Called when a drag and drop action has been performed */
            this.props.store.dispatch({
                type: 'MOVE_FORM',
                formId: formId,
                position: position,
            });
        });

        let onAdd = (position: number) => {
            /* Fired when the user clicks the "add new" button */

            let formId = this.props.forms.length;

            // Create the form
            this.props.store.dispatch({
                type: 'ADD_FORM',
                data: {
                    fields: this.props.emptyForm.fields,
                    extra: {},
                    errors: {},
                    isNew: true,
                    hasChanged: true,
                    isEditing: true,
                    position: this.props.forms.length + 1,
                    id: formId,
                }
            });

            // Move it into position
            this.props.store.dispatch({
                type: 'MOVE_FORM',
                formId: formId,
                position: position,
            });
        };

        // Add gap objects into the cards
        renderedCards = this.initGaps(renderedCards, onDND, onAdd);

        // Create an add button if the form isn't orderable
        let addButton = null;
        if (this.props.canEdit) {
            let onClickAddButton = (e: any) => {
                onAdd(1);

                e.preventDefault();
                return false;
            };
            addButton = <button className="condensed-inline-panel__top-add-button button bicolor icon icon-plus" type="button" onClick={onClickAddButton}>{this.props.panelLabel}</button>;
        }

        return <div>
            {addButton}
            {renderedCards}
        </div>;
    }
}

// FIXME: Had to remove type because of https://github.com/gaearon/react-dnd/issues/581
export let DNDCardSet: React.ComponentClass<CardSetProps> = DragDropContext(HTML5Backend)(CardSet);
