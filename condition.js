class Condition {
  constructor(builder, parentGroup, data = {}) {
    this.builder = builder;
    this.parentGroup = parentGroup;
    this.id = builder.nextId();
    this.el = this.createElement(data);
    this.attachDrag();
  }

  createElement(data) {
    const condition = document.createElement('div');
    condition.className = 'cb-condition';
    condition.dataset.type = 'condition';
    condition.dataset.id = this.id;

    const field = document.createElement('select');
    field.className = 'cb-field';
    this.populateOptions(field, this.builder.fields, data.field);

    const operator = document.createElement('select');
    operator.className = 'cb-operator';
    this.populateOptions(operator, this.builder.operators, data.operator);

    const value = document.createElement('input');
    value.className = 'cb-value';
    value.type = 'text';
    value.value = data.value ?? '';

    const actions = document.createElement('div');
    actions.className = 'cb-condition-actions';

    const drag = document.createElement('button');
    drag.className = 'cb-icon cb-drag';
    drag.title = 'Drag to move';
    drag.textContent = '⇅';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'cb-icon cb-delete';
    deleteBtn.title = 'Delete condition';
    deleteBtn.textContent = '✕';

    deleteBtn.addEventListener('click', () => this.remove());

    actions.append(drag, deleteBtn);
    condition.append(field, operator, value, actions);
    this.field = field;
    this.operator = operator;
    this.value = value;
    this.drag = drag;

    return condition;
  }

  populateOptions(select, options, selected) {
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select';
    placeholder.disabled = true;
    placeholder.selected = !selected;
    select.appendChild(placeholder);

    options.forEach((option) => {
      const opt = document.createElement('option');
      if (typeof option === 'string') {
        opt.value = option;
        opt.textContent = option;
      } else {
        opt.value = option.value;
        opt.textContent = option.label;
      }
      opt.selected = option.value === selected || option === selected;
      select.appendChild(opt);
    });
  }

  attachDrag() {
    this.el.draggable = true;
    this.el.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', this.id);
      event.dataTransfer.effectAllowed = 'move';
      this.builder.setDragging(this);
    });

    this.el.addEventListener('dragend', () => {
      this.builder.setDragging(null);
    });
  }

  remove() {
    this.parentGroup.removeItem(this);
    this.el.remove();
  }

  toJSON() {
    return {
      type: 'condition',
      field: this.field.value,
      operator: this.operator.value,
      value: this.value.value,
    };
  }

  validate() {
    const isValid = Boolean(this.field.value && this.operator.value && this.value.value.trim() !== '');
    this.el.classList.toggle('is-invalid', !isValid);
    return isValid;
  }
}

window.Condition = Condition;
