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

Initialization happens automatically when an element with `id="builder"` exists. By default no IF / ELSE IF / THEN / ELSE blocks are pre-created — use the top-row buttons to add whichever expressions you need. Each IF / ELSE IF instantly contains a starter condition group (logic AND by default) plus a THEN action row labelled "Вернуть значение", while ELSE holds a THEN action without a condition. Inside any THEN/ELSE body you can also spin up another nested expression builder to model chains like the multi-level IF / ELSE blocks from the control example. To configure options manually after the scripts load:

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
      expressions: [
        {
          type: 'IF',
          condition: {
            type: 'group',
            logic: 'AND',
            not: false,
            items: [
              { type: 'condition', field: 'Tags.Name', operator: 'contains', value: 'VIP' },
              { type: 'condition', field: 'Amount', operator: '>', value: '100' },
            ],
          },
          then: { value: 'Approve request' },
        },
        {
          type: 'ELSE IF',
          condition: {
            type: 'group',
            logic: 'OR',
            not: false,
            items: [{ type: 'condition', field: 'Status', operator: '!=', value: 'Blocked' }],
          },
          then: { value: 'Fallback route' },
        },
        { type: 'ELSE', then: { value: 'Reject request' } },
      ],
    },
  });
</script>
```

## Public API

`ConditionBuilder` methods:

- `toJSON()` – returns a deterministic JSON structure with ordered expressions, each containing a condition (for IF / ELSE IF) and a THEN action, plus optional nested expressions inside THEN/ELSE bodies.
- `validate()` – validates logical ordering (IF first, ELSE IF before ELSE), ensures every condition is filled, and that each THEN/ELSE action has a value; highlights invalid nodes.
- `ConditionBuilder.fromJSON(mount, json, options?)` – convenience factory that builds the tree from an existing JSON payload.

In demo mode the builder instance is available on `window.conditionBuilder` for quick inspection, e.g. `conditionBuilder.toJSON()` in the console.

## Features

- Add/remove conditions and nested groups at any depth (10+ levels supported).
- Ordered IF / ELSE IF / ELSE expressions where every IF/ELSE IF contains both a prebuilt condition group and a THEN action; ELSE holds its own action and can host nested expressions.
- Nested expressions can be created from inside any THEN or ELSE body, allowing arbitrarily deep conditional chains.
- Collapse/expand groups with `.collapsed` state.
- Drag-and-drop reordering across sibling items or moving to another group body (conditions and groups are both draggable).
- Built-in styling that highlights nested levels, buttons, and invalid states.

The component uses only modern browser APIs and avoids external dependencies, making it easy to embed inside any host page.
