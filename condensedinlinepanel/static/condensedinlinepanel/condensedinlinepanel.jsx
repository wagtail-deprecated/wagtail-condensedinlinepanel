import {createStore} from 'redux';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DragSource, DropTarget, DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';


export function reducer(state=null, action) {
    if (action.type == 'SET_STATE') {
        return action.state;
    } else if (state == null) {
        // Ignore everything until we get an initial state
        return null;
    }

    let deserialisedState = JSON.parse(state);

    if (action.type == 'SET_FORM') {
        deserialisedState.forms[action.formId] = action.data;
    }

    if (action.type == 'ADD_FORM') {
        deserialisedState.forms.push(action.data);
    }

    if (action.type == 'MOVE_FORM') {
        let movedForm = deserialisedState.forms[action.formId];
        movedForm.hasChanged = true;
        let previousPosition = movedForm.position;
        let newPosition = action.position;
        if (newPosition > previousPosition) newPosition--;
        movedForm.position = newPosition;

        // Update sort orders of all other forms
        for (let i = 0; i < deserialisedState.forms.length; i++) {
            if (i == action.formId) continue;

            let form = deserialisedState.forms[i];

            // Forms after the previous position move up one
            if (form.position >= previousPosition) {
                form.position--;
            }

            // Forms after the new position move down one
            if (form.position >= newPosition) {
                form.position++;
            }
        }
    }

    return JSON.stringify(deserialisedState);
}


class Card extends React.Component {
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

    constructor(props) {
        super(props);

        this.state = {
            showDeleteConfirm: false,
        }
    }

    getFormHtml() {
        return {
            __html: this.props.template.replace(/__prefix__/g, this.props.formId)
        };
    }

    initialiseForm() {
        /* Called just after the form has been inserted into the DOM, this
        initialises all of the componenents in the form */

        // Find form element
        let reactElement = ReactDOM.findDOMNode(this);
        let formElement = reactElement.getElementsByClassName('condensed-inline-panel__form')[0];

        // Copy field data into the form
        for (let fieldName in this.props.fields) {
            let fieldElement = document.getElementById(`${this.props.formPrefix}-${fieldName}`);
            fieldElement.value = this.props.fields[fieldName]
        }

        // Add errors
        for (let fieldName in this.props.errors) {
            let fieldWrapper = document.getElementById(`${this.props.formPrefix}-${fieldName}`).closest('.field');
            fieldWrapper.classList.add('error');

            // Append error text to field content
            let fieldContent = fieldWrapper.getElementsByClassName('field-content')[0] || fieldWrapper;
            let errors = document.createElement('p');
            errors.classList.add('error-message');
            errors.innerHTML = `<span>${this.props.errors[fieldName].map((error) => error.message).join(' ')}</span>`;
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
            let fieldName = pageChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/)[1];

            if (this.props.fields[fieldName]) {
                // Field has a value!

                // Remove blank class
                pageChooser.classList.remove('blank');

                // Set title
                pageChooser.getElementsByClassName('title')[0].textContent = this.props.extra[fieldName]['title'];
            }
        }

        // HACK: Make image choosers work
        let imageChoosers = formElement.getElementsByClassName('image-chooser');
        for (let i = 0; i < imageChoosers.length; i++) {
            let imageChooser = imageChoosers.item(i);
            let fieldName = imageChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/)[1];

            if (this.props.fields[fieldName]) {
                // Field has a value!

                // Remove blank class
                imageChooser.classList.remove('blank');

                // Preview image
                let previewImage = imageChooser.querySelector('.preview-image img');
                previewImage.src = this.props.extra[fieldName]['preview_image'].src;
                previewImage.alt = this.props.extra[fieldName]['preview_image'].alt;
                previewImage.width = this.props.extra[fieldName]['preview_image'].width;
                previewImage.height = this.props.extra[fieldName]['preview_image'].height;
            }
        }
    }

    shouldRenderForm(props=this.props) {
        /* Returns true if we need the form HTML to be rendered in the DOM */

        // Note, we still need the form HTML when the form has been edited/deleted
        // so the changes get submitted back to Wagtail
        return (props.isEditing || props.hasChanged || props.deleted) && props.canEdit;
    }


    // Actions

    onEditStart(e) {
        return this.props.onEditStart(e);
    }

    onEditClose(e) {
        let newFields = {};

        for (let fieldName in this.props.fields) {
            let fieldElement = document.getElementById(`${this.props.formPrefix}-${fieldName}`);
            newFields[fieldName] = fieldElement.value;
        }

        return this.props.onEditClose(e, newFields);
    }

    onDelete(e) {
        this.state.showDeleteConfirm = true;
        this.setState(this.state);

        e.preventDefault();
        return false;
    }

    onDeleteCancel(e) {
        this.state.showDeleteConfirm = false;
        this.setState(this.state);

        e.preventDefault();
        return false;
    }

    onDeleteConfirm(e) {
        return this.props.onDelete(e);
    }

    renderActions(onEditClose) {
        /* Renders the action buttons that appear on the right side of the header */
        let actions = [];

        // Edit/close action
        if (this.props.canEdit) {
            if (this.props.isEditing) {
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

        if (Object.keys(this.props.errors).length > 0) {
            classes.push('condensed-inline-panel__card--errors');
        }

        if (this.props.isNew) {
            classes.push('condensed-inline-panel__card--new');
        } else if (this.props.hasChanged) {
            classes.push('condensed-inline-panel__card--changed');
        }

        if (this.props.deleted) {
            classes.push('condensed-inline-panel__card--deleted');
        } else if (this.props.isEditing) {
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

        let card = <div className={this.getClassNames().join(' ')}>
            <div className="condensed-inline-panel__card-header">
                <ul className="condensed-inline-panel__actions">
                    {this.renderActions()}
                </ul>
                <h2>{this.props.summaryText}</h2>
            </div>
            {form}
        </div>;

        // Hook into react dnd
        card = this.props.connectDragSource(card);

        return card;
    }

    componentDidUpdate(prevProps, prevState) {
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
    canDrag(props, monitor) {
        return props.canOrder;
    },
    beginDrag(props, monitor, component) {
        return {
            formId: props.formId
        };
    }
}

function dragSourceCollect(connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging(),
    };
}

Card = DragSource((props) => props.dndKey, dragSource, dragSourceCollect)(Card);


class Gap extends React.Component {
    /*
     * This component fills the gap between cards and is used as a drop target
     * and a place for the "add new" button
    */

    drop(formId) {
        this.props.onDND(formId, this.props.position);
    }

    render() {
        let classes = ['condensed-inline-panel__gap'];

        let gap = null;
        if (this.props.isOver) {
            classes.push('condensed-inline-panel__gap--over');

            gap = <div className={classes.join(' ')}>
                      <div className="condensed-inline-panel__gap-pseudoform" />
                  </div>;
        } else {
            let onAdd = (e) => {
                this.props.onAdd(this.props.position);

                e.preventDefault();
                return false;
            };

            gap = <div className={classes.join(' ')}>
                      <a className="condensed-inline-panel__add-button icon icon-plus-inverse" href="#" onClick={onAdd}></a>
                  </div>;
        }

        // Hook into react dnd
        gap = this.props.connectDropTarget(gap);

        return gap;
    }
}

let dropTarget = {
    drop(props, monitor, component) {
        component.drop(monitor.getItem().formId);
    }
};

function dropTargetCollect(connect, monitor) {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.canDrop() && monitor.isOver(),
    };
}

Gap = DropTarget((props) => props.dndKey, dropTarget, dropTargetCollect)(Gap);


class CardSet extends React.Component {
    initGaps(forms, onDND, onAdd) {
        /* Injects Gap components into an array of rendered cards */

        let positionId = 0;
        let newForms = [];

        // Add the top gap
        newForms.push(<Gap key={'gap-' + positionId} position={positionId++} dndKey={this.props.dndKey||this.props.formsetPrefix} onDND={onDND} onAdd={onAdd} />);

        for (let i = 0; i < forms.length; i++) {
            newForms.push(forms[i]);

            // Add a gap
            newForms.push(<Gap key={'gap-' + positionId} position={positionId++} dndKey={this.props.dndKey||this.props.formsetPrefix} onDND={onDND} onAdd={onAdd} />);
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

            let onEditStart = (e) => {
                /* Fired when the user clicks the "edit" button on the card */

                // Start editing the card
                form.isEditing = true;
                form.hasChanged = true;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: form.id,
                    data: form,
                });

                e.preventDefault();
                return false;
            };

            let onDelete = (e) => {
                /* Fired when the user clicks the "delete" button on the card */

                // Set "DELETE" field
                form.isDeleted = true;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: form.id,
                    data: form,
                });

                e.preventDefault();
                return false;
            };

            let onEditClose = (e, newFields) => {
                /* Fired when the user clicks the "close" button in the form */

                // Save the form data
                form.isEditing = false;
                form.fields = newFields;
                this.props.store.dispatch({
                    type: 'SET_FORM',
                    formId: form.id,
                    data: form,
                });

                e.preventDefault();
                return false;
            };

            // Render the card component
            renderedCards.push(<Card key={form.id}
                                     formId={form.id}
                                     summaryText={form.fields[this.props.summaryTextField]}
                                     canEdit={this.props.canEdit}
                                     canDelete={this.props.canDelete}
                                     canOrder={this.props.canOrder}
                                     template={this.props.formTemplate}
                                     formPrefix={`${this.props.formsetPrefix}-${form.id.toString()}`}
                                     fields={form.fields}
                                     extra={form.extra}
                                     errors={form.errors}
                                     deleted={form.isDeleted||false}
                                     isEditing={form.isEditing||false}
                                     isNew={form.isNew||false}
                                     hasChanged={form.hasChanged||false}
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

        let onAdd = (position) => {
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
                    position: this.props.forms.length,
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
            let onClickAddButton = (e) => {
                onAdd(0);

                e.preventDefault();
                return false;
            };
            addButton = <button className="condensed-inline-panel__top-add-button bicolor icon icon-plus" type="button" onClick={onClickAddButton}>Add</button>;
        }

        return <div>
            {addButton}
            {renderedCards}
        </div>;
    }
}

CardSet = DragDropContext(HTML5Backend)(CardSet);

export {Card, CardSet};

export function init(id, options={}) {
    const canEdit = options['canEdit'] || true;
    const canDelete = options['canDelete'] || canEdit;
    const canOrder = options['canOrder'] || false;
    const summaryTextField = options['summaryTextField'];

    let element = document.getElementById(id);
    let totalFormsField = document.getElementById(id + '-TOTAL_FORMS');
    let dataField = element.getElementsByClassName('condensed-inline-panel__data')[0];
    let sortOrderField = element.getElementsByClassName('condensed-inline-panel__sort-order')[0];
    let uiContainer = element.getElementsByClassName('condensed-inline-panel__ui-container')[0];

    let store = createStore(reducer);

    // Rerender component when state changes
    store.subscribe(() => {
        let state = JSON.parse(store.getState());
        ReactDOM.render(<CardSet forms={state.forms}
                                 summaryTextField={summaryTextField}
                                 canEdit={canEdit}
                                 canDelete={canDelete}
                                 canOrder={canOrder}
                                 store={store}
                                 emptyForm={state.emptyForm}
                                 formTemplate={element.dataset.formTemplate}
                                 formsetPrefix={id}
                                 sortCompareFunc={((a, b) => a.position > b.position)} />, uiContainer);
    });

    // Keep sort order field up to date
    if (canOrder) {
        let sortOrderField = element.getElementsByClassName('condensed-inline-panel__sort-order')[0];
        store.subscribe(() => {
            let state = JSON.parse(store.getState());
            let sortOrders = [];

            for (let i = 0; i< state.forms.length; i++) {
                sortOrders.push(state.forms[i].position);
            }

            sortOrderField.value = JSON.stringify(sortOrders);
        });
    }

    // Keep delete field up to date
    let deleteField = element.getElementsByClassName('condensed-inline-panel__delete')[0];
    store.subscribe(() => {
        let state = JSON.parse(store.getState());
        let deletedForms = [];

        for (let i = 0; i< state.forms.length; i++) {
            if (state.forms[i].isDeleted) {
                deletedForms.push(state.forms[i].id);
            }
        }

        deleteField.value = JSON.stringify(deletedForms);
    });

    // Set initial state
    store.dispatch({
        type: 'SET_STATE',
        state: dataField.value,
    });

    // Update TOTAL_FORMS when the number of forms changes
    store.subscribe(() => {
        let state = JSON.parse(store.getState());
        totalFormsField.value = state.forms.length;
    });
}
