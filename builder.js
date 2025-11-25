/* global ConditionGroup */

class ConditionBuilder {
  constructor(mount, options = {}) {
    this.mount = typeof mount === 'string' ? document.querySelector(mount) : mount;
    this.fields = options.fields || ['Amount', 'Tags.Name', 'Status'];
    this.operators = options.operators || ['=', '!=', '>', '<', 'contains'];
    this.registry = new Map();
    this.idCounter = 0;
    this.dragging = null;
    this.ifGroup = null;
    this.elseIfGroups = [];
    this.thenInput = null;
    this.elseInput = null;
    this.controlButtons = {};
    this.expressionList = null;
    this.render(options.data || null);
  }

  render(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'condition-builder';

    const expressions = data || {};

    const controls = this.createExpressionControls();
    const list = document.createElement('div');
    list.className = 'cb-expression-list';
    this.expressionList = list;

    wrapper.append(controls, list);

    if (expressions.if) {
      this.addIfSection(expressions.if);
    }

    if (expressions.elseIf && Array.isArray(expressions.elseIf)) {
      expressions.elseIf.forEach((entry) => this.addElseIfSection(entry));
    }

    if (Object.prototype.hasOwnProperty.call(expressions, 'then')) {
      this.addThenSection(expressions.then);
    }

    if (Object.prototype.hasOwnProperty.call(expressions, 'else')) {
      this.addElseSection(expressions.else);
    }

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

  createExpressionControls() {
    const controls = document.createElement('div');
    controls.className = 'cb-expression-controls';

    const addButton = (key, label, handler) => {
      const btn = document.createElement('button');
      btn.className = 'cb-btn cb-btn-add-expression';
      btn.textContent = label;
      btn.addEventListener('click', handler);
      this.controlButtons[key] = btn;
      controls.appendChild(btn);
    };

    addButton('if', 'Добавить IF', () => this.addIfSection());
    addButton('elseIf', 'Добавить ELSE IF', () => this.addElseIfSection());
    addButton('then', 'Добавить THEN', () => this.addThenSection());
    addButton('else', 'Добавить ELSE', () => this.addElseSection());

    this.updateExpressionControls();
    return controls;
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

  createExpressionSection(title, initializer, allowMultiple = false, removable = true) {
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
      if (!allowMultiple) {
        body.innerHTML = '';
      }
      this.addRootGroup(body, { logic, type: 'group', not: false, items: [] });
    });

    actions.appendChild(addControls);

    if (removable) {
      const remove = document.createElement('button');
      remove.className = 'cb-icon cb-delete';
      remove.title = 'Удалить блок';
      remove.textContent = '✕';
      remove.addEventListener('click', () => {
        section.remove();
        initializer(body, true);
      });
      actions.appendChild(remove);
    }

    header.append(label, actions);
    section.append(header, body);

    initializer(body, false);

    return section;
  }

  createValueSection(title, initialValue = '', removable = true, onRemove = () => {}) {
    const section = document.createElement('div');
    section.className = 'cb-expression-block';

    const header = document.createElement('div');
    header.className = 'cb-expression-header';

    const label = document.createElement('div');
    label.className = 'cb-expression-title';
    label.textContent = title;

    const actions = document.createElement('div');
    actions.className = 'cb-expression-actions';

    if (removable) {
      const remove = document.createElement('button');
      remove.className = 'cb-icon cb-delete';
      remove.title = 'Удалить блок';
      remove.textContent = '✕';
      remove.addEventListener('click', () => {
        section.remove();
        onRemove();
      });
      actions.appendChild(remove);
    }

    header.append(label, actions);

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

    if (group.rootKind === 'IF') {
      this.ifGroup = group;
    }

    if (group.rootKind === 'ELSE IF') {
      this.elseIfGroups = this.elseIfGroups || [];
      if (!this.elseIfGroups.includes(group)) {
        this.elseIfGroups.push(group);
      }
    }

    this.updateExpressionControls();
    return group;
  }

  removeRootGroup(group) {
    if (group.rootKind === 'ELSE IF' && this.elseIfGroups) {
      this.elseIfGroups = this.elseIfGroups.filter((entry) => entry !== group);
    }
    if (group.rootKind === 'IF' && this.ifGroup === group) {
      this.ifGroup = null;
    }
    const parentBody = group.el.parentElement;
    if (parentBody && parentBody._group === group) {
      parentBody._group = null;
    }
    group.el.remove();
    this.updateExpressionControls();
  }

  addIfSection(data = null) {
    if (this.ifSection) {
      this.ifSection.remove();
    }

    const initializer = (body, isRemove) => {
      if (isRemove) {
        if (this.ifGroup) {
          this.removeRootGroup(this.ifGroup);
        }
        this.ifSection = null;
        this.updateExpressionControls();
        return;
      }
      if (body && data) {
        body.innerHTML = '';
        const group = this.addRootGroup(body, data);
        body._group = group;
      }
    };

    const section = this.createExpressionSection('IF', initializer, false, true);
    this.ifSection = section;
    this.expressionList.appendChild(section);
    this.updateExpressionControls();
  }

  addElseIfSection(data = null) {
    const initializer = (body, isRemove) => {
      if (isRemove) {
        if (body && body._group) {
          this.removeRootGroup(body._group);
        }
        this.elseIfGroups = this.elseIfGroups.filter((grp) => grp !== body?._group);
        this.updateExpressionControls();
        return;
      }

      if (body && data) {
        body.innerHTML = '';
        const group = this.addRootGroup(body, data);
        body._group = group;
      }
    };

    const section = this.createExpressionSection('ELSE IF', initializer, false, true);
    const body = section.querySelector('.cb-expression-body');
    if (typeof body._group === 'undefined') {
      body._group = null;
    }

    // override add control to enforce a single group per ELSE IF section
    const addBtn = section.querySelector('.cb-btn-add-group');
    const logicSelect = section.querySelector('.cb-logic');
    addBtn.replaceWith(addBtn.cloneNode(true));
    const newAddBtn = section.querySelector('.cb-btn-add-group');
    newAddBtn.addEventListener('click', () => {
      body.innerHTML = '';
      const group = this.addRootGroup(body, { logic: logicSelect.value, type: 'group', not: false, items: [] });
      body._group = group;
    });

    this.expressionList.appendChild(section);
    this.updateExpressionControls();
  }

  addThenSection(initialValue = '') {
    if (this.thenSection) {
      this.thenSection.remove();
    }

    const onRemove = () => {
      this.thenInput = null;
      this.thenSection = null;
      this.updateExpressionControls();
    };

    const section = this.createValueSection('THEN', initialValue || '', true, onRemove);
    this.thenSection = section;
    this.expressionList.appendChild(section);
    this.updateExpressionControls();
  }

  addElseSection(initialValue = '') {
    if (this.elseSection) {
      this.elseSection.remove();
    }

    const onRemove = () => {
      this.elseInput = null;
      this.elseSection = null;
      this.updateExpressionControls();
    };

    const section = this.createValueSection('ELSE', initialValue || '', true, onRemove);
    this.elseSection = section;
    this.expressionList.appendChild(section);
    this.updateExpressionControls();
  }

  updateExpressionControls() {
    if (!this.controlButtons) return;
    if (this.controlButtons.if) {
      this.controlButtons.if.disabled = Boolean(this.ifSection);
    }
    if (this.controlButtons.then) {
      this.controlButtons.then.disabled = Boolean(this.thenInput);
    }
    if (this.controlButtons.else) {
      this.controlButtons.else.disabled = Boolean(this.elseInput);
    }
  }

  toJSON() {
    return {
      if: this.ifGroup ? this.ifGroup.toJSON() : null,
      elseIf: this.elseIfGroups ? this.elseIfGroups.map((grp) => grp.toJSON()) : [],
      then: this.thenInput ? this.thenInput.value : null,
      else: this.elseInput ? this.elseInput.value : null,
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
