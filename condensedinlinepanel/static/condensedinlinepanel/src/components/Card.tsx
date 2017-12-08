import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DragSource} from 'react-dnd';

import {Form, FieldError} from '../types';
import {FormContainer} from './FormContainer';

export type customiseActionsFn = (props: CardProps, actions: any[]) => void;
export type onEditStartFn = (e: MouseEvent) => boolean;
export type onEditCloseFn = (e: MouseEvent, newFields: {[name: string]: any;}) => boolean;
export type onDeleteFn = (e: MouseEvent) => boolean;
export type renderCardHeaderFn = (form: Form) => {__html: string};

export interface CardProps {
    // The form this card represents
    form: Form,

    // A function that returns a HTML string to insert as the header content
    renderCardHeader: renderCardHeaderFn,

    // Set to true if this card can be edited
    canEdit: boolean,

    // Set to true if this card can be deleted
    canDelete: boolean,

    // Set to true if this card can be moved
    canOrder: boolean,

    // A HTML template to use for the form
    template: string,

    // The prefix appended to the beginning of the id of each field
    formPrefix: string,

    // A hook to allow the action buttons to be customised.
    // The props are passed through in the first argument and the list of actions
    // in the second argument
    customiseActions?: customiseActionsFn,

    // A key to pass to react-dnd which is different for each cardset.
    // This prevents cards from being ordered across different sets.
    dndKey: string,


    // The following props are added by react-dnd
    connectDragSource?: any,
    isDragging?: boolean,

    // Events

    // Fired when the user clicks the "edit" button on the card
    onEditStart: onEditStartFn,

    // Fired when the user clicks the "close" button in the form
    onEditClose: onEditCloseFn

    // Fired when the user clicks the "delete" button on the card
    onDelete: onDeleteFn,
}

export interface CardState {
    showDeleteConfirm: boolean
}

export class Card extends React.Component<CardProps, CardState> {
    /*
     * This component represents an individual object in the panel
     *
     * When not being edited, this displays a card to the user
     * When being edited, it expands into a form interface
     *
     */

    constructor(props: CardProps) {
        super(props);

        this.state = {
            showDeleteConfirm: false,
        }
    }

    shouldRenderForm(props=this.props) {
        /* Returns true if we need the form HTML to be rendered in the DOM */

        if (props.form.forceFormRender) {
            return true;
        }

        // Note, we still need the form HTML when the form has been edited/deleted
        // so the changes get submitted back to Wagtail
        return (props.form.isEditing || props.form.hasChanged || props.form.isDeleted) && props.canEdit;
    }


    // Actions

    onEditStart(e: MouseEvent) {
        return this.props.onEditStart(e);
    }

    onEditClose(e: MouseEvent) {
        let newFields: {[name: string]: string;} = {};

        for (let fieldName in this.props.form.fields) {
            let fieldElement = document.getElementById(`${this.props.formPrefix}-${fieldName}`);

            if (fieldElement instanceof HTMLInputElement || fieldElement instanceof HTMLTextAreaElement || fieldElement instanceof HTMLSelectElement) {
                newFields[fieldName] = fieldElement.value;
            }
        }

        return this.props.onEditClose(e, newFields);
    }

    onDelete(e: MouseEvent) {
        this.setState({showDeleteConfirm: true});

        e.preventDefault();
        return false;
    }

    onDeleteCancel(e: MouseEvent) {
        this.setState({showDeleteConfirm: false});

        e.preventDefault();
        return false;
    }

    onDeleteConfirm(e: MouseEvent) {
        return this.props.onDelete(e);
    }

    renderActions() {
        /* Renders the action buttons that appear on the right side of the header */
        let actions = [];

        // Edit/close action
        if (this.props.canEdit) {
            if (this.props.form.isEditing) {
                actions.push(
                    <li key="edit-close" onClick={this.onEditClose.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-close icon icon-edit"></li>
                );
            } else {
                actions.push(
                    <li key="edit-start" onClick={this.onEditStart.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-edit icon icon-edit"></li>
                );
            }
        }

        // Delete action
        if (this.props.canDelete) {
            actions.push(
                <li key="delete" onClick={this.onDelete.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-delete icon icon-bin"></li>
            );
        }

        // Custom actions
        if (this.props.customiseActions) {
            this.props.customiseActions(this.props, actions);
        }

        // Delete confirm hides all other actions
        if (this.props.canDelete && this.state.showDeleteConfirm) {
            actions = [
                <li key="delete-confirm" className="condensed-inline-panel__delete-confirm-message">Are you sure that you want to delete this?</li>,
                <li key="delete" onClick={this.onDeleteConfirm.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-delete-confirm icon icon-tick"></li>,
                <li key="cancel" onClick={this.onDeleteCancel.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-delete-confirm-cancel icon icon-cross"></li>,
            ];
        }

        return actions;
    }

    getClassNames() {
        /* Returns a list of class names to add to the card */
        let classes = ['condensed-inline-panel__card'];

        if (this.props.form.errors && Object.keys(this.props.form.errors).length > 0) {
            classes.push('condensed-inline-panel__card--errors');
        }

        if (this.props.form.isNew) {
            classes.push('condensed-inline-panel__card--new');
        } else if (this.props.form.hasChanged) {
            classes.push('condensed-inline-panel__card--changed');
        }

        if (this.props.form.isDeleted) {
            classes.push('condensed-inline-panel__card--deleted');
        } else if (this.props.form.isEditing) {
            classes.push('condensed-inline-panel__card--editing');
        }

        if (this.props.isDragging) {
            classes.push('condensed-inline-panel__card--dragging');
        }

        return classes;
    }

    render() {
        let form = <div className="condensed-inline-panel__form" />;
        if (this.shouldRenderForm()) {
            form = <FormContainer form={this.props.form} template={this.props.template} prefix={this.props.formPrefix} />;
        }

        let header = <div className="condensed-inline-panel__card-header">
            <ul className="condensed-inline-panel__actions">
                {this.renderActions()}
            </ul>
            <h2 dangerouslySetInnerHTML={this.props.renderCardHeader(this.props.form)} />
        </div>;

        // Hook into react dnd
        header = this.props.connectDragSource(header);

        return <div className={this.getClassNames().join(' ')}>
            {header}
            {form}
        </div>;
    }
}

let dragSource = {
    canDrag(props: CardProps, monitor: any) {
        return props.canOrder;
    },
    beginDrag(props: CardProps, monitor: any, component: any) {
        return {
            formId: props.form.id
        };
    }
}

function dragSourceCollect(connect: any, monitor: any) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging(),
    };
}

// FIXME: Had to remove type because of https://github.com/gaearon/react-dnd/issues/581
export let DraggableCard: React.ComponentClass<CardProps> = DragSource((props) => props.dndKey, dragSource, dragSourceCollect)(Card);
