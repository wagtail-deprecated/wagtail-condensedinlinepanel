import {Form} from './types';


export interface State {
    // List of all the forms in this session, including deleted and new forms
    forms: Form[],

    // A form instance to copy when creating new forms. Has default values pre-filled
    emptyForm: Form,
}


export interface SetStateAction {
    type: "SET_STATE",
    state: string,
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

export type Action = SetStateAction | SetFormAction | AddFormAction | MoveFormAction;


export function reducer(state: string|null = null, action: Action): string|null {
    if (action.type == 'SET_STATE') {
        return action.state;
    } else if (state == null) {
        // Ignore everything until we get an initial state
        return null;
    }

    let deserializedState: State = JSON.parse(state);

    if (action.type == 'SET_FORM') {
        deserializedState.forms[action.formId] = action.data;
    }

    if (action.type == 'ADD_FORM') {
        deserializedState.forms.push(action.data);
    }

    if (action.type == 'MOVE_FORM') {
        let movedForm = deserializedState.forms[action.formId];
        movedForm.hasChanged = true;
        let previousPosition = movedForm.position;
        let newPosition = action.position;
        if (newPosition > previousPosition) newPosition--;
        movedForm.position = newPosition;

        // Update sort orders of all other forms
        for (let i = 0; i < deserializedState.forms.length; i++) {
            if (i == action.formId) continue;

            let form = deserializedState.forms[i];

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

    return JSON.stringify(deserializedState);
}
