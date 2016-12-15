# Condensed InlinePanel for Wagtail CMS

**WARNING**: This component is in early stages of development and contains bugs. It may also require customisation in order to use it on a new project.

This repository contains a drop-in replacement for Wagtail's ``InlinePanel``.
It's designed with a lighter interface that's suitable for cases where there
may be hundreds of items in the panel.

![Screenshot](screenshot.png)

## Features

 - Fast, react-based UI that hides away forms that aren't being used
 - Drag and drop reordering
 - Create a new item at any point

## Installation

Firstly, install the module with PIP:

```shell
pip install -e git://github.com/kaedroho/wagtail-condensedinlinepanel.git@v0.1#egg=wagtail-condensedinlinepanel
```

Then, add ``condensedinlinepanel`` to your ``INSTALLED_APPS``:

```python
# settings.py


INSTALLED_APPS = [
    ...

    'condensedinlinepanel`,

    ...
]
```

Then, finally, import the edit handler and use it. ``CondensedInlinePanel`` can be used as a drop-in replacement for Wagtail's built-in ``InlinePanel``:

```python
# models.py

...

from condensedinlinepanel.edit_handlers import CondensedInlinePanel

...

class MyPage(Page):
    ...

    content_panels = [
        ...

        CondensedInlinePanel('carousel_items', label="Carousel items", card_header_from_field="title"),
    ]
