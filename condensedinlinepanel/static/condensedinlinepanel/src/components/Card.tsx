import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DragSource} from 'react-dnd';

import {Form, FieldError} from '../types';


export type customiseActionsFn = (props: CardProps, actions: any[]) => void;
export type onEditStartFn = (e: MouseEvent) => boolean;
export type onEditCloseFn = (e: MouseEvent, newFields: {[name: string]: any;}) => boolean;
export type onDeleteFn = (e: MouseEvent) => boolean;
export type renderCardHeaderFn = (form: Form) => {__html: string};


export interface CardProps {
    form: Form,
    renderCardHeader: renderCardHeaderFn,
    canEdit: boolean,
    canDelete: boolean,
    canOrder: boolean,
    template: string,
    formPrefix: string,
    customiseActions?: customiseActionsFn,
    onEditStart: onEditStartFn,
    onEditClose: onEditCloseFn
    onDelete: onDeleteFn,
    dndKey: string,
    connectDragSource?: any,
    isDragging?: boolean,
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
     * props:
     *  - formId: The number of the form (as assigned by Wagtail)
     *  - summaryText: The text to show at the top
     *  - canEdit: (boolean)  Set to true if this card can be edited
     *  - canDelete: (boolean) Set to true if this card can be deleted
     *  - canOrder: (boolean) Set to true if this card can be moved
     *  - template: A HTML template to use for the form
     *  - formPrefix: The prefix appeneded to the beginning of the id of each field
     *  - fields: Mapping of field names to their current values
     *  - extra: Any extra data that might be useful for rendering fields (eg, title of chosen page)
     *  - errors: A mapping of field names to a list of errors
     *  - deleted: (boolean). Set when the card has been deleted
     *  - isEditing: (boolean). Set when this card is being edited (displays the expanded form)
     *  - isNew: (boolean). Set when this card has been created in this session
     *  - hasChanged (boolean). Set when this card has been changed in this session
     *  - customiseActions. A hook to allow the action buttons to be customised.
     *    The props are passed through in the first argument and the list of actions
     *    in the second argument
     *  - dndKey: A key to pass to react-dnd which is different for each cardset.
     *    This prevents cards from being ordered across different sets.
     *
     * The following props are added by react-dnd:
     *  - connectDragSource: Used to hook in react-dnd
     *  - isDragging: (boolean) Set when this card is being dragged
     *
     * events:
     *  - onEditStart: Fired when the user clicks the "edit" button on the card
     *  - onDelete: Fired when the user clicks the "delete" button on the card
     *  - onEditClose: Fired when the user clicks the "close" button in the form
     */

    constructor(props: CardProps) {
        super(props);

        this.state = {
            showDeleteConfirm: false,
        }
    }

    getFormHtml() {
        return {
            __html: this.props.template.replace(/__prefix__/g, this.props.form.id.toString())
        };
    }

    initialiseForm() {
        /* Called just after the form has been inserted into the DOM, this
        initialises all of the componenents in the form */

        // Find form element
        let reactElement = ReactDOM.findDOMNode(this);
        let formElement = reactElement.getElementsByClassName('condensed-inline-panel__form')[0];

        // Copy field data into the form
        for (let fieldName in this.props.form.fields) {
            let fieldElement = document.getElementById(`${this.props.formPrefix}-${fieldName}`);

            if (fieldElement instanceof HTMLInputElement) {
                fieldElement.value = this.props.form.fields[fieldName]
            }
        }

        // Add errors
        for (let fieldName in this.props.form.errors) {
            let fieldElement = document.getElementById(`${this.props.formPrefix}-${fieldName}`);
            if (fieldElement === null) {
                continue;
            }
            let fieldWrapperElement = fieldElement.closest('.field');
            if (fieldWrapperElement === null) {
                continue;
            }

            fieldWrapperElement.classList.add('error');

            // Append error text to field content
            let fieldContent = fieldWrapperElement.getElementsByClassName('field-content')[0] || fieldWrapperElement;
            let errors = document.createElement('p');
            errors.classList.add('error-message');
            errors.innerHTML = `<span>${this.props.form.errors[fieldName].map((error) => error.message).join(' ')}</span>`;
            fieldContent.appendChild(errors);
        }

        // Run any script tags embedded in the form HTML
        let scriptTags = formElement.getElementsByTagName('script');
        for (let i = 0; i < scriptTags.length; i++) {
            let scriptTag = scriptTags.item(i);

            eval(scriptTag.innerHTML);
        }

        // HACK: Make page choosers work
        let pageChoosers = formElement.getElementsByClassName('page-chooser');
        for (let i = 0; i < pageChoosers.length; i++) {
            let pageChooser = pageChoosers.item(i);
            let match = pageChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/);

            if (match) {
                let fieldName = match[1];

                if (this.props.form.fields[fieldName]) {
                    // Field has a value!

                    // Remove blank class
                    pageChooser.classList.remove('blank');

                    // Set title
                    pageChooser.getElementsByClassName('title')[0].textContent = this.props.form.extra[fieldName]['title'];
                }
            }
        }

        // HACK: Make image choosers work
        let imageChoosers = formElement.getElementsByClassName('image-chooser');
        for (let i = 0; i < imageChoosers.length; i++) {
            let imageChooser = imageChoosers.item(i);
            let match = imageChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/);

            if (match) {
                let fieldName = match[1];

                if (this.props.form.fields[fieldName]) {
                    // Field has a value!

                    // Remove blank class
                    imageChooser.classList.remove('blank');

                    // Preview image
                    let previewImage = imageChooser.querySelector('.preview-image img');
                    if (previewImage instanceof HTMLImageElement) {
                        previewImage.src = this.props.form.extra[fieldName]['preview_image'].src;
                        previewImage.alt = this.props.form.extra[fieldName]['preview_image'].alt;
                        previewImage.width = this.props.form.extra[fieldName]['preview_image'].width;
                        previewImage.height = this.props.form.extra[fieldName]['preview_image'].height;
                    }
                }
            }
        }
    }

    shouldRenderForm(props=this.props) {
        /* Returns true if we need the form HTML to be rendered in the DOM */

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

            if (fieldElement instanceof HTMLInputElement) {
                newFields[fieldName] = fieldElement.value;
            }
        }

        return this.props.onEditClose(e, newFields);
    }

    onDelete(e: MouseEvent) {
        this.state.showDeleteConfirm = true;
        this.setState(this.state);

        e.preventDefault();
        return false;
    }

    onDeleteCancel(e: MouseEvent) {
        this.state.showDeleteConfirm = false;
        this.setState(this.state);

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
                <li className="condensed-inline-panel__delete-confirm-message">Are you sure that you want to delete this?</li>,
                <li key="delete" onClick={this.onDeleteConfirm.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-delete-confirm icon icon-tick"></li>,
                <li key="cancel" onClick={this.onDeleteCancel.bind(this)} className="condensed-inline-panel__action condensed-inline-panel__action-delete-confirm-cancel icon icon-cross"></li>,
            ];
        }

        return actions;
    }

    getClassNames() {
        /* Returns a list of class names to add to the card */
        let classes = ['condensed-inline-panel__card'];

        if (Object.keys(this.props.form.errors).length > 0) {
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
            form = <div className="condensed-inline-panel__form" dangerouslySetInnerHTML={this.getFormHtml()} />
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

    componentDidUpdate(prevProps: CardProps, prevState: CardState) {
        // If the form has just been rendered, run initialiseForm
        if (this.shouldRenderForm() && !this.shouldRenderForm(prevProps)) {
            this.initialiseForm();
        }
    }

    componentDidMount() {
        // If the form has just been rendered, run initialiseForm
        if (this.shouldRenderForm()) {
            this.initialiseForm();
        }
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
