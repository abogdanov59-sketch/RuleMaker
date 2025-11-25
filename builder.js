/* global ConditionGroup */

class ConditionBuilder {
  constructor(mount, options = {}) {
    this.mount = typeof mount === 'string' ? document.querySelector(mount) : mount;
    this.fields = options.fields || ['Amount', 'Tags.Name', 'Status'];
    this.operators = options.operators || ['=', '!=', '>', '<', 'contains'];
    this.registry = new Map();
    this.idCounter = 0;
    this.dragging = null;
    this.render(options.data || null);
  }

  render(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'condition-builder';

    const expressions = data || {};

    const ifSection = this.createExpressionSection('IF', (container) => {
      this.ifGroup = this.addRootGroup(container, expressions.if || { type: 'group', logic: 'AND', not: false, items: [] });
    });

    const elseIfSection = this.createExpressionSection('ELSE IF', (container) => {
      const list = expressions.elseIf && Array.isArray(expressions.elseIf) && expressions.elseIf.length
        ? expressions.elseIf
        : [];

      this.elseIfGroups = list.map((item) => this.addRootGroup(container, item));
    }, true);

    const thenSection = this.createValueSection('THEN', expressions.then || '');
    const elseSection = this.createValueSection('ELSE', expressions.else || '');

    wrapper.append(ifSection, elseIfSection, thenSection, elseSection);
    this.mount.innerHTML = '';
    this.mount.appendChild(wrapper);
  }

  nextId() {
    this.idCounter += 1;
    return `cb-${this.idCounter}`;
  }

  register(instance) {
    this.registry.set(instance.id, instance);
  }

  lookupById(id) {
    return this.registry.get(id);
  }

  setDragging(item) {
    this.dragging = item;
  }

  createLogicSelect(selected = 'AND') {
    const select = document.createElement('select');
    select.className = 'cb-logic';
    ['AND', 'OR'].forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      opt.selected = value === selected;
      select.appendChild(opt);
    });
    return select;
  }

  createGroupAddControls(onAdd, label = 'группу') {
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-logic-add';

    const logicSelect = this.createLogicSelect();
    wrapper.appendChild(logicSelect);

    const btn = document.createElement('button');
    btn.className = 'cb-btn cb-btn-add-group';
    btn.textContent = `Добавить ${label}`;
    btn.addEventListener('click', () => onAdd({ logic: logicSelect.value }));
    wrapper.appendChild(btn);

    return wrapper;
  }

  createExpressionSection(title, initializer, allowMultiple = false) {
    const section = document.createElement('div');
    section.className = 'cb-expression-block';

    const header = document.createElement('div');
    header.className = 'cb-expression-header';

    const label = document.createElement('div');
    label.className = 'cb-expression-title';
    label.textContent = title;

    const actions = document.createElement('div');
    actions.className = 'cb-expression-actions';

    const body = document.createElement('div');
    body.className = 'cb-expression-body';
    body.dataset.expr = title;

    const addControls = this.createGroupAddControls(({ logic }) => {
      const group = this.addRootGroup(body, { logic, type: 'group', not: false, items: [] });
      if (!allowMultiple) {
        body.innerHTML = '';
        body.appendChild(group.el);
        this.ifGroup = group;
      } else {
        this.elseIfGroups = this.elseIfGroups || [];
        this.elseIfGroups.push(group);
      }
    });

    actions.appendChild(addControls);
    header.append(label, actions);
    section.append(header, body);

    initializer(body);

    return section;
  }

  createValueSection(title, initialValue = '') {
    const section = document.createElement('div');
    section.className = 'cb-expression-block';

    const header = document.createElement('div');
    header.className = 'cb-expression-header';

    const label = document.createElement('div');
    label.className = 'cb-expression-title';
    label.textContent = title;

    header.appendChild(label);

    const body = document.createElement('div');
    body.className = 'cb-expression-body cb-expression-body--value';

    const input = document.createElement('textarea');
    input.className = 'cb-expression-value';
    input.placeholder = 'Введите возвращаемое значение для ' + title;
    input.value = initialValue;

    body.appendChild(input);
    section.append(header, body);

    if (title === 'THEN') {
      this.thenInput = input;
    }
    if (title === 'ELSE') {
      this.elseInput = input;
    }

    return section;
  }

  addRootGroup(container, data) {
    const group = new ConditionGroup(this, null, { ...data, rootKind: container.dataset.expr || null });
    container.appendChild(group.el);
    this.register(group);
    return group;
  }

  removeRootGroup(group) {
    if (group.rootKind === 'ELSE IF' && this.elseIfGroups) {
      this.elseIfGroups = this.elseIfGroups.filter((entry) => entry !== group);
    }
    group.el.remove();
  }

  toJSON() {
    return {
      if: this.ifGroup ? this.ifGroup.toJSON() : null,
      elseIf: this.elseIfGroups ? this.elseIfGroups.map((grp) => grp.toJSON()) : [],
      then: this.thenInput ? this.thenInput.value : '',
      else: this.elseInput ? this.elseInput.value : '',
    };
  }

  validate() {
    const validations = [];
    if (this.ifGroup) validations.push(this.ifGroup.validate());
    if (this.elseIfGroups) {
      this.elseIfGroups.forEach((grp) => validations.push(grp.validate()));
    }
    return validations.every(Boolean);
  }

  static fromJSON(mount, json, options = {}) {
    const builder = new ConditionBuilder(mount, { ...options, data: json });
    return builder;
  }
}

// auto init demo
const mountPoint = document.getElementById('builder');
if (mountPoint) {
  const builder = new ConditionBuilder(mountPoint, {
    fields: [
      { label: 'Amount', value: 'Amount' },
      { label: 'Tags.Name', value: 'Tags.Name' },
      { label: 'Status', value: 'Status' },
      { label: 'Country', value: 'Country' },
    ],
    operators: ['=', '!=', '>', '<', '>=', '<=', 'contains'],
  });

  // expose for debugging/demo
  window.conditionBuilder = builder;
}
