# RuleMaker

A lightweight, framework-free condition builder component. The component is fully modular (HTML + CSS + vanilla JS) and can be embedded into any page via a single container element.

## Files

- `index.html` – demo shell to mount the builder.
- `style.css` – styles for the builder, grouped by BEM-like classes (`.condition-builder`, `.cb-group`, `.cb-condition`, etc.).
- `builder.js` – entry module that wires the builder into a container and exposes the public API.
- `group.js` – UI logic for condition groups, including AND/OR selection, NOT toggle, collapse, drag-and-drop, and nested add/remove actions.
- `condition.js` – UI logic for individual conditions (field/operator/value with validation and drag support).

## Usage

```html
<link rel="stylesheet" href="style.css" />
<div id="builder"></div>
<script src="condition.js" defer></script>
<script src="group.js" defer></script>
<script src="builder.js" defer></script>
```

Initialization happens automatically when an element with `id="builder"` exists. To configure options manually after the scripts load:

```html
<div id="builder"></div>
<script>
  const builder = new ConditionBuilder('#builder', {
    fields: [
      { label: 'Amount', value: 'Amount' },
      { label: 'Tags.Name', value: 'Tags.Name' },
      { label: 'Status', value: 'Status' },
    ],
    operators: ['=', '!=', '>', '<', '>=', '<=', 'contains'],
    data: {
      type: 'group',
      logic: 'AND',
      not: false,
      items: [
        { type: 'condition', field: 'Tags.Name', operator: 'contains', value: 'VIP' },
        {
          type: 'group',
          logic: 'OR',
          not: true,
          items: [{ type: 'condition', field: 'Amount', operator: '>', value: '100' }],
        },
      ],
    },
  });
</script>
```

## Public API

`ConditionBuilder` methods:

- `toJSON()` – returns a deterministic JSON structure of the current state (groups, conditions, logic, NOT flags, ordering).
- `validate()` – validates that every condition has field, operator, and value; highlights invalid nodes.
- `ConditionBuilder.fromJSON(mount, json, options?)` – convenience factory that builds the tree from an existing JSON payload.

In demo mode the builder instance is available on `window.conditionBuilder` for quick inspection, e.g. `conditionBuilder.toJSON()` in the console.

## Features

- Add/remove conditions and nested groups at any depth (10+ levels supported).
- Switch logic between **AND**/**OR** and invert groups via **NOT**; create new groups or subgroups directly with **Add AND group** / **Add OR group** buttons.
- Collapse/expand groups with `.collapsed` state.
- Drag-and-drop reordering across sibling items or moving to another group body.
- Built-in styling that highlights nested levels, buttons, and invalid states.

The component uses only modern browser APIs and avoids external dependencies, making it easy to embed inside any host page.
