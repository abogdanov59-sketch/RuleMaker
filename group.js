/* global Condition */

class ConditionGroup {
  constructor(builder, parentGroup = null, data = {}) {
    this.builder = builder;
    this.parentGroup = parentGroup;
    this.id = builder.nextId();
    this.items = [];
    this.el = this.createElement(data);
    this.attachDrag();
    this.loadItems(data.items || []);
  }

  createElement(data) {
    const group = document.createElement('div');
    group.className = 'cb-group';
    group.dataset.type = 'group';
    group.dataset.id = this.id;

    const header = document.createElement('div');
    header.className = 'cb-group-header';

    const meta = document.createElement('div');
    meta.className = 'cb-group-meta';

    const logic = this.builder.createLogicSelect(data.logic || 'AND');

    const expression = this.builder.createExpressionSelect(data.expression || '');
    expression.addEventListener('change', () => this.updateTag(expression.value));

    const notBtn = document.createElement('button');
    notBtn.className = 'cb-icon cb-invert';
    notBtn.textContent = 'NOT';
    notBtn.title = 'Invert group';
    notBtn.addEventListener('click', () => this.toggleNot());

    const tag = document.createElement('span');
    tag.className = 'cb-tag';
    tag.textContent = data.expression ? `${data.expression} group` : 'Group';

    meta.append(logic, expression, notBtn, tag);

    const actions = document.createElement('div');
    actions.className = 'cb-group-actions';

    const collapse = document.createElement('button');
    collapse.className = 'cb-icon cb-collapse';
    collapse.title = 'Collapse/expand';
    collapse.textContent = '−';
    collapse.addEventListener('click', () => this.toggleCollapse());

    const drag = document.createElement('button');
    drag.className = 'cb-icon cb-drag';
    drag.title = 'Drag to move';
    drag.textContent = '⇅';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cb-icon cb-delete';
    deleteBtn.title = 'Delete group';
    deleteBtn.textContent = '✕';
    deleteBtn.disabled = this.parentGroup === null;

    deleteBtn.addEventListener('click', () => this.remove());

    actions.append(collapse, drag, deleteBtn);

    header.append(meta, actions);

    const body = document.createElement('div');
    body.className = 'cb-group-body';
    body.addEventListener('dragover', (event) => this.onDragOver(event));
    body.addEventListener('drop', (event) => this.onDrop(event));

    const footer = document.createElement('div');
    footer.className = 'cb-group-footer';

    const addCondition = document.createElement('button');
    addCondition.className = 'cb-btn cb-btn-add-condition';
    addCondition.textContent = 'Add condition';
    addCondition.addEventListener('click', () => this.addCondition());

    const addGroupControls = this.builder.createLogicAddControls(({ logic, expression: newExpression }) => this.addGroup({ logic, expression: newExpression }), 'subgroup');

    footer.append(addCondition, addGroupControls);

    group.append(header, body, footer);
    this.logic = logic;
    this.expression = expression;
    this.notBtn = notBtn;
    this.body = body;
    this.drag = drag;
    this.collapseBtn = collapse;

    if (data.not) {
      this.toggleNot(true);
    }

    this.updateTag(data.expression || '');

    return group;
  }

  attachDrag() {
    this.el.draggable = this.parentGroup !== null;
    this.el.addEventListener('dragstart', (event) => {
      if (!this.el.draggable) return;
      event.dataTransfer.setData('text/plain', this.id);
      event.dataTransfer.effectAllowed = 'move';
      this.builder.setDragging(this);
    });

    this.el.addEventListener('dragend', () => this.builder.setDragging(null));
  }

  loadItems(items) {
    items.forEach((item) => {
      if (item.type === 'condition') {
        this.addCondition(item);
      }
      if (item.type === 'group') {
        this.addGroup(item);
      }
    });
  }

  addCondition(data = {}) {
    const condition = new Condition(this.builder, this, data);
    this.items.push(condition);
    this.body.appendChild(condition.el);
    this.builder.register(condition);
    return condition;
  }

  addGroup(data = {}) {
    const group = new ConditionGroup(this.builder, this, data);
    this.items.push(group);
    this.body.appendChild(group.el);
    this.builder.register(group);
    return group;
  }

  removeItem(item) {
    this.items = this.items.filter((entry) => entry !== item);
  }

  remove() {
    if (this.parentGroup) {
      this.parentGroup.removeItem(this);
      this.el.remove();
    }
  }

  toggleNot(forceValue = null) {
    const shouldInvert = forceValue !== null ? forceValue : !this.el.classList.contains('is-not');
    this.el.classList.toggle('is-not', shouldInvert);
  }

  toggleCollapse() {
    this.el.classList.toggle('collapsed');
  }

  onDragOver(event) {
    event.preventDefault();
    const dragging = this.builder.dragging;
    if (!dragging || dragging === this || dragging === this.parentGroup) return;

    const targetItem = event.target.closest('.cb-condition, .cb-group');
    const isSameContainer = targetItem && targetItem.parentElement === this.body;

    if (isSameContainer && targetItem !== dragging.el) {
      const rect = targetItem.getBoundingClientRect();
      const isBefore = event.clientY < rect.top + rect.height / 2;
      this.body.insertBefore(dragging.el, isBefore ? targetItem : targetItem.nextSibling);
    } else if (!targetItem) {
      this.body.appendChild(dragging.el);
    }
  }

  onDrop(event) {
    event.preventDefault();
    const dragging = this.builder.dragging;
    if (!dragging) return;

    const originParent = dragging.parentGroup;
    if (originParent && originParent !== this) {
      originParent.removeItem(dragging);
    }

    if (!this.body.contains(dragging.el)) {
      this.body.appendChild(dragging.el);
    }

    dragging.parentGroup = this;

    const elements = Array.from(this.body.children);
    this.items = elements.map((el) => this.builder.lookupById(el.dataset.id));
  }

  toJSON() {
    return {
      type: 'group',
      logic: this.logic.value,
      expression: this.expression.value || null,
      not: this.el.classList.contains('is-not'),
      items: this.items.map((item) => item.toJSON()),
    };
  }

  validate() {
    const validItems = this.items.map((item) => item.validate());
    const isValid = validItems.every(Boolean);
    this.el.classList.toggle('is-invalid', !isValid);
    return isValid;
  }

  updateTag(expressionValue) {
    this.el.dataset.expression = expressionValue || '';
    const tag = this.el.querySelector('.cb-tag');
    if (tag) {
      tag.textContent = expressionValue ? `${expressionValue} group` : 'Group';
    }
  }
}

window.ConditionGroup = ConditionGroup;
