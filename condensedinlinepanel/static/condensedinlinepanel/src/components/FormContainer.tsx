import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DragSource} from 'react-dnd';

import {Form, FieldError} from '../types';

export interface FormContainerProps {
    // The form
    form: Form,

    // A HTML template to use for the form
    template: string,

    // The prefix appended to the beginning of the id of each field
    prefix: string,
}

export class FormContainer extends React.Component<FormContainerProps, {}> {
    getHtml() {
        return {
            __html: this.props.template.replace(/__prefix__/g, this.props.form.id.toString())
        };
    }

    render() {
        return <div className="condensed-inline-panel__form" dangerouslySetInnerHTML={this.getHtml()} />;
    }

    componentDidMount() {
        /* Called just after the form has been inserted into the DOM, this
        initialises all of the components in the form */

        // Find form element
        let formElement = ReactDOM.findDOMNode(this);

        // Copy field data into the form
        for (let fieldName in this.props.form.fields) {
            let fieldElement = document.getElementById(`${this.props.prefix}-${fieldName}`);

            if (fieldElement instanceof HTMLInputElement || fieldElement instanceof HTMLTextAreaElement || fieldElement instanceof HTMLSelectElement) {
                if (fieldElement instanceof HTMLInputElement && fieldElement.type === "checkbox") {
                    let fieldElementAny: any = fieldElement;
                    fieldElementAny.checked = this.props.form.fields[fieldName];
                } else {
                    fieldElement.value = this.props.form.fields[fieldName];
                }
            }
        }

        // Add errors
        if (this.props.form.errors) {
            for (let fieldName in this.props.form.errors) {
                let fieldElement = document.getElementById(`${this.props.prefix}-${fieldName}`);
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

        // HACK: Make snippet choosers work
        let snippetChoosers = formElement.getElementsByClassName('snippet-chooser');
        for (let i = 0; i < snippetChoosers.length; i++) {
            let snippetChooser = snippetChoosers.item(i);
            let match = snippetChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/);

            if (match) {
                let fieldName = match[1];

                if (this.props.form.fields[fieldName]) {
                    // Field has a value!

                    // Remove blank class
                    snippetChooser.classList.remove('blank');

                    // Set title
                    snippetChooser.getElementsByClassName('title')[0].textContent = this.props.form.extra[fieldName]['title'];
                }
            }
        }

        // HACK: Make document choosers work
        let documentChoosers = formElement.getElementsByClassName('document-chooser');
        for (let i = 0; i < documentChoosers.length; i++) {
            let documentChooser = documentChoosers.item(i);
            let match = documentChooser.id.match(/id_[^-]*-\d+-([^-]*)-chooser/);

            if (match) {
                let fieldName = match[1];

                if (this.props.form.fields[fieldName]) {
                    // Field has a value!

                    // Remove blank class
                    documentChooser.classList.remove('blank');

                    // Set title
                    documentChooser.getElementsByClassName('title')[0].textContent = this.props.form.extra[fieldName]['title'];
                }
            }
        }
    }
}
