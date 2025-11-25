/* global ConditionGroup */

class ConditionBuilder {
  constructor(mount, options = {}) {
    this.mount = typeof mount === 'string' ? document.querySelector(mount) : mount;
    this.fields = options.fields || ['Amount', 'Tags.Name', 'Status'];
    this.operators = options.operators || ['=', '!=', '>', '<', 'contains'];
    this.registry = new Map();
    this.idCounter = 0;
    this.dragging = null;
    this.controlButtons = {};
    this.expressionList = null;
    this.expressions = [];
    this.isNested = Boolean(options.nested);
    this.render(options.data || null);
  }

  render(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'condition-builder';

    const expressions = Array.isArray(data?.expressions) ? data.expressions : [];

    const controls = this.createExpressionControls();
    const list = document.createElement('div');
    list.className = 'cb-expression-list';
    this.expressionList = list;

    wrapper.append(controls, list);

    expressions.forEach((expr) => this.addExpression(expr.type || expr.kind, expr));

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

    addButton('if', 'Добавить IF', () => this.addExpression('IF'));
    addButton('elseIf', 'Добавить ELSE IF', () => this.addExpression('ELSE IF'));
    addButton('else', 'Добавить ELSE', () => this.addExpression('ELSE'));

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

  createExpressionBlock(kind, data = {}) {
    const section = document.createElement('div');
    section.className = 'cb-expression-block';

    const header = document.createElement('div');
    header.className = 'cb-expression-header';

    const title = document.createElement('div');
    title.className = 'cb-expression-title';
    title.textContent = kind;

    const actions = document.createElement('div');
    actions.className = 'cb-expression-actions';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cb-icon cb-delete';
    removeBtn.title = 'Удалить выражение';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => this.removeExpression(section));

    actions.append(removeBtn);
    header.append(title, actions);

    const body = document.createElement('div');
    body.className = 'cb-expression-body';

    const expression = {
      kind,
      section,
      body,
      thenInput: null,
      conditionGroup: null,
      nestedBuilder: null,
    };

    if (kind !== 'ELSE') {
      const conditionWrap = document.createElement('div');
      conditionWrap.className = 'cb-expression-condition';

      const conditionTitle = document.createElement('div');
      conditionTitle.className = 'cb-subtitle';
      conditionTitle.textContent = 'Условие';

      const conditionBody = document.createElement('div');
      conditionBody.className = 'cb-expression-condition-body';
      conditionBody.dataset.expr = kind;

      const addControls = this.createGroupAddControls(({ logic }) => {
        conditionBody.innerHTML = '';
        expression.conditionGroup = this.addRootGroup(conditionBody, {
          logic,
          type: 'group',
          not: false,
          items: [],
          rootKind: kind,
        });
      }, 'группу');

      conditionWrap.append(conditionTitle, conditionBody, addControls);
      body.appendChild(conditionWrap);

      if (data.condition) {
        conditionBody.innerHTML = '';
        expression.conditionGroup = this.addRootGroup(conditionBody, { ...data.condition, rootKind: kind });
      } else {
        expression.conditionGroup = this.addRootGroup(conditionBody, {
          type: 'group',
          logic: 'AND',
          not: false,
          items: [],
          rootKind: kind,
        });
      }
    }

    const actionWrap = document.createElement('div');
    actionWrap.className = 'cb-expression-action';

    const actionTitle = document.createElement('div');
    actionTitle.className = 'cb-subtitle';
    actionTitle.textContent = 'Действие (THEN)';

    const actionBody = document.createElement('div');
    actionBody.className = 'cb-expression-action-body';

    const returnRow = document.createElement('div');
    returnRow.className = 'cb-return-row';

    const valueLabel = document.createElement('label');
    valueLabel.className = 'cb-return-label';
    valueLabel.textContent = 'Вернуть значение:';

    const input = document.createElement('textarea');
    input.className = 'cb-expression-value';
    input.placeholder = 'Например: LowRisk, MediumRisk, HighRisk';
    input.value = data.then?.value || '';
    expression.thenInput = input;

    returnRow.append(valueLabel, input);

    const nestedArea = document.createElement('div');
    nestedArea.className = 'cb-nested-expressions';

    const nestedControls = document.createElement('div');
    nestedControls.className = 'cb-nested-controls';
    const nestedBtn = document.createElement('button');
    nestedBtn.className = 'cb-btn cb-btn-add-expression';
    nestedBtn.textContent = 'Добавить вложенное выражение';
    nestedBtn.addEventListener('click', () => {
      if (expression.nestedBuilder) return;
      const nestedContainer = document.createElement('div');
      nestedContainer.className = 'cb-nested-container';
      nestedArea.appendChild(nestedContainer);
      expression.nestedBuilder = new ConditionBuilder(nestedContainer, {
        fields: this.fields,
        operators: this.operators,
        nested: true,
      });
      expression.nestedBuilder.updateExpressionControls();
    });
    nestedControls.appendChild(nestedBtn);

    if (data.then?.nested) {
      const nestedContainer = document.createElement('div');
      nestedContainer.className = 'cb-nested-container';
      nestedArea.appendChild(nestedContainer);
      expression.nestedBuilder = new ConditionBuilder(nestedContainer, {
        fields: this.fields,
        operators: this.operators,
        nested: true,
        data: data.then.nested,
      });
    }

    actionBody.append(returnRow, nestedControls, nestedArea);
    actionWrap.append(actionTitle, actionBody);
    body.appendChild(actionWrap);

    section.append(header, body);
    return expression;
  }

  addRootGroup(container, data) {
    const group = new ConditionGroup(this, null, data);
    container.appendChild(group.el);
    this.register(group);
    return group;
  }

  addExpression(kind, data = {}) {
    if (!this.canAdd(kind)) return;
    const expression = this.createExpressionBlock(kind, data || {});
    if (kind === 'IF') {
      this.expressions.unshift(expression);
      this.expressionList.prepend(expression.section);
    } else {
      this.expressions.push(expression);
      this.expressionList.appendChild(expression.section);
    }

    this.updateExpressionControls();
  }

  removeRootGroup(group) {
    const expr = this.expressions.find((entry) => entry.conditionGroup === group);
    if (!expr) return;
    const container = group.el.parentElement;
    group.el.remove();
    if (container) {
      expr.conditionGroup = this.addRootGroup(container, {
        type: 'group',
        logic: 'AND',
        not: false,
        items: [],
        rootKind: expr.kind,
      });
    } else {
      expr.conditionGroup = null;
    }
    this.updateExpressionControls();
  }

  removeExpression(section) {
    const removed = this.expressions.find((expr) => expr.section === section);
    this.expressions = this.expressions.filter((expr) => expr.section !== section);
    section.remove();

    if (!this.expressions.some((expr) => expr.kind === 'IF')) {
      this.expressions.forEach((expr) => expr.section.remove());
      this.expressions = [];
    } else if (removed && removed.kind === 'ELSE') {
      // drop stray ELSE IF items that would follow a removed ELSE
      const firstElseIndex = this.expressions.findIndex((expr) => expr.kind === 'ELSE');
      if (firstElseIndex !== -1) {
        const trailing = this.expressions.slice(firstElseIndex + 1);
        trailing.forEach((expr) => expr.section.remove());
        this.expressions = this.expressions.slice(0, firstElseIndex + 1);
      }
    }
    this.updateExpressionControls();
  }

  canAdd(kind) {
    const hasIf = this.expressions.some((expr) => expr.kind === 'IF');
    const hasElse = this.expressions.some((expr) => expr.kind === 'ELSE');
    if (kind === 'IF') return !hasIf;
    if (kind === 'ELSE IF') return hasIf && !hasElse;
    if (kind === 'ELSE') return hasIf && !hasElse;
    return true;
  }

  updateExpressionControls() {
    if (!this.controlButtons) return;
    const hasIf = this.expressions.some((expr) => expr.kind === 'IF');
    const hasElse = this.expressions.some((expr) => expr.kind === 'ELSE');

    if (this.controlButtons.if) this.controlButtons.if.disabled = hasIf;
    if (this.controlButtons.elseIf) this.controlButtons.elseIf.disabled = !hasIf || hasElse;
    if (this.controlButtons.else) this.controlButtons.else.disabled = !hasIf || hasElse;
  }

  toJSON() {
    return {
      expressions: this.expressions.map((expr) => ({
        type: expr.kind,
        condition: expr.conditionGroup ? expr.conditionGroup.toJSON() : null,
        then: {
          value: expr.thenInput ? expr.thenInput.value : '',
          nested: expr.nestedBuilder ? expr.nestedBuilder.toJSON() : null,
        },
      })),
    };
  }

  validateSequence() {
    if (this.expressions.length === 0) return true;
    if (this.expressions[0].kind !== 'IF') return false;
    let seenElse = false;
    for (let i = 0; i < this.expressions.length; i += 1) {
      const kind = this.expressions[i].kind;
      if (kind === 'ELSE') seenElse = true;
      if (seenElse && kind === 'ELSE IF') return false;
    }
    return true;
  }

  validate() {
    const sequenceValid = this.validateSequence();
    let allValid = sequenceValid;

    this.expressions.forEach((expr) => {
      let exprValid = true;
      const hasCondition = expr.kind === 'ELSE' ? true : Boolean(expr.conditionGroup);
      if (!hasCondition) exprValid = false;
      if (expr.kind !== 'ELSE' && expr.conditionGroup) {
        exprValid = expr.conditionGroup.validate() && exprValid;
      }
      const hasAction = expr.thenInput && expr.thenInput.value.trim() !== '';
      expr.thenInput.classList.toggle('is-invalid', !hasAction);
      if (!hasAction) exprValid = false;
      if (expr.nestedBuilder) {
        exprValid = expr.nestedBuilder.validate() && exprValid;
      }
      if (!sequenceValid) exprValid = false;
      expr.section.classList.toggle('is-invalid', !exprValid);
      allValid = allValid && exprValid;
    });

    return allValid;
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
