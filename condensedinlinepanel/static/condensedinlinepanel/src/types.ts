export interface FieldError {
    code: string,
    message: string,
}

export interface Form {
    // The ID assigned by Wagtail
    // Note: Not the same as the primary key of the object
    id: number,

    // The in python string representation of the object
    instanceAsStr?: string,

    // Is the form being edited (aka. is it expanded?)
    isEditing?: boolean,

    // Was the form created in this session?
    isNew?: boolean,

    // Has the form been deleted in this session?
    isDeleted?: boolean,

    // Has the form been changed in this session?
    hasChanged?: boolean,

    // The current position of the form in the panel (1 based)
    position: number,

    // Set to true will force the form fields to be rendered in HTML
    forceFormRender?: boolean,

    // The field data. Mapping of field names to values
    fields: {[name: string]: string;},

    // Extra data about specific fields
    // This includes useful stuff such as the title of a linked document or the source an image
    extra: {[name: string]: any;},

    // Field errors. Mapping of field names to list of errors
    errors?: {[name: string]: FieldError[];},
}
