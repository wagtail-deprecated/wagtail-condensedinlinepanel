import {Form} from './types';

export interface State {
    // List of all the forms in this session, including deleted and new forms
    // Note: Each form has an ID, which is an index into this array. To prevent
    // these IDs from becoming invalid, the forms are never reordered in this
    // list, new forms are always appended to the end and deleted forms are not
    // removed.
    // Form ordering is instead represented by the "position" field on each form.
    // and deletion status is represented by the "isDeleted" field.
    forms: Form[],

    // A form instance to copy when creating new forms. Has default values pre-filled
    emptyForm: Form,
}

export interface SetStateAction {
    type: "SET_STATE",
    state: State,
}

export interface SetFormAction {
    type: "SET_FORM",
    formId: number,
    data: Form,
}

export interface AddFormAction {
    type: "ADD_FORM",
    data: Form,
}

export interface MoveFormAction {
    type: "MOVE_FORM",
    formId: number,
    position: number,
}

// Need to define an action without any required fields to satisfy type checking
// (this is because redux will fire other events that we haven't defined here)
export interface OtherAction {
    type: "OTHER_ACTION",
}

export type Action = SetStateAction | SetFormAction | AddFormAction | MoveFormAction | OtherAction;

export function emptyState(): State {
    /* Returns an empty state to use as a placeholder before an actual state is loaded */

    return {
        forms: [],
        emptyForm: {
            id: 0,
            isEditing: false,
            isNew: false,
            isDeleted: false,
            hasChanged: false,
            position: 1,
            fields: {},
            extra: {},
            errors: {},
        }
    }
}

export function reducer(state: State|null = null, action: Action): State|null {
    if (action.type == 'SET_STATE') {
        return action.state;
    } else if (state == null) {
        // Ignore everything until we get an initial state
        return null;
    }

    let {forms, emptyForm} = state;

    if (action.type == 'SET_FORM') {
        let newForms = forms.slice();
        newForms[action.formId] = action.data;
        return {forms: newForms, emptyForm};
    }

    if (action.type == 'ADD_FORM') {
        let newForms = forms.slice();
        newForms.push(action.data);
        return {forms: newForms, emptyForm};
    }

    if (action.type == 'MOVE_FORM') {
        let newForms = forms.slice();

        let movedForm = newForms[action.formId];
        movedForm.hasChanged = true;
        let previousPosition = movedForm.position;
        let newPosition = action.position;
        if (newPosition > previousPosition) newPosition--;
        movedForm.position = newPosition;

        // Update sort orders of all other forms
        for (let i = 0; i < newForms.length; i++) {
            if (i == action.formId) continue;

            let form = newForms[i];

            // Forms after the previous position move up one
            if (form.position >= previousPosition) {
                form.position--;
            }

            // Forms after the new position move down one
            if (form.position >= newPosition) {
                form.position++;
            }
        }

        return {forms: newForms, emptyForm};
    }

    return {forms, emptyForm};
}
