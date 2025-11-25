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

    const controls = document.createElement('div');
    controls.className = 'cb-controls';

    const addGroupControl = document.createElement('div');
    addGroupControl.className = 'cb-inline-control';

    const addGroupLogic = this.createLogicSelect('AND');
    addGroupLogic.title = 'Logic for new groups';

    const addCondition = document.createElement('button');
    addCondition.className = 'cb-btn cb-btn-add-condition';
    addCondition.textContent = 'Add condition';
    addCondition.addEventListener('click', () => this.rootGroup.addCondition());

    const addGroup = document.createElement('button');
    addGroup.className = 'cb-btn cb-btn-add-group';
    addGroup.textContent = 'Add group';
    addGroup.addEventListener('click', () => this.rootGroup.addGroup({ logic: addGroupLogic.value }));

    addGroupControl.append(addGroupLogic, addGroup);

    controls.append(addCondition, addGroupControl);

    wrapper.appendChild(controls);

    this.rootGroup = new ConditionGroup(this, null, data || { type: 'group', logic: 'AND', not: false, items: [] });
    wrapper.appendChild(this.rootGroup.el);
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

  toJSON() {
    return this.rootGroup.toJSON();
  }

  validate() {
    return this.rootGroup.validate();
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
