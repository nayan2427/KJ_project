const FORM_SCHEMA = {
  id: "contractor-onboarding-form",
  title: "Dynamic Multi-Step Form Engine",
  subtitle:
    "Generated entirely from JSON schema with conditional logic, validation, persistence, and animated multi-step navigation.",
  storageKey: "dynamic-form-engine-demo-v1",
  steps: [
    {
      id: "personal",
      title: "Personal Information",
      description: "Start with your basic profile details.",
      fields: [
        {
          type: "text",
          name: "fullName",
          label: "Full Name",
          placeholder: "Jane Doe",
          required: true,
          minLength: 3,
          maxLength: 60,
          col: 6
        },
        {
          type: "email",
          name: "email",
          label: "Email Address",
          placeholder: "jane@example.com",
          required: true,
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
          col: 6
        },
        {
          type: "number",
          name: "age",
          label: "Age",
          placeholder: "30",
          required: true,
          pattern: "^(1[89]|[2-9]\\d)$",
          helpText: "Must be 18 or older for this demo.",
          col: 6
        },
        {
          type: "radio",
          name: "role",
          label: "Work Type",
          required: true,
          col: 6,
          options: [
            { label: "Employee", value: "employee" },
            { label: "Contractor", value: "contractor" },
            { label: "Vendor", value: "vendor" }
          ]
        }
      ]
    },
    {
      id: "work",
      title: "Work Details",
      description: "Fields in this step react to prior selections.",
      fields: [
        {
          type: "text",
          name: "company",
          label: "Company Name",
          placeholder: "Acme Inc.",
          required: true,
          minLength: 2,
          maxLength: 80,
          col: 6
        },
        {
          type: "select",
          name: "department",
          label: "Department",
          required: true,
          col: 6,
          options: [
            { label: "Select a department", value: "" },
            { label: "Engineering", value: "engineering" },
            { label: "Design", value: "design" },
            { label: "Marketing", value: "marketing" },
            { label: "Operations", value: "operations" }
          ]
        },
        {
          type: "text",
          name: "contractAgency",
          label: "Contract Agency",
          placeholder: "Northstar Staffing",
          col: 6,
          required: true,
          dependsOn: {
            field: "role",
            operator: "===",
            value: "contractor"
          }
        },
        {
          type: "number",
          name: "contractDuration",
          label: "Contract Duration (months)",
          placeholder: "12",
          col: 6,
          required: true,
          pattern: "^([1-9]|1[0-9]|2[0-4])$",
          dependsOn: {
            field: "role",
            operator: "===",
            value: "contractor"
          }
        },
        {
          type: "checkbox",
          name: "equipmentNeeded",
          label: "Need company equipment?",
          col: 12,
          dependsOn: {
            field: "role",
            operator: "!==",
            value: "vendor"
          }
        }
      ]
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Capture setup choices and preferences.",
      fields: [
        {
          type: "select",
          name: "workMode",
          label: "Preferred Work Mode",
          required: true,
          col: 6,
          options: [
            { label: "Select work mode", value: "" },
            { label: "On-site", value: "onsite" },
            { label: "Hybrid", value: "hybrid" },
            { label: "Remote", value: "remote" }
          ]
        },
        {
          type: "text",
          name: "city",
          label: "City",
          placeholder: "Berlin",
          required: true,
          minLength: 2,
          maxLength: 50,
          col: 6
        },
        {
          type: "text",
          name: "shippingAddress",
          label: "Shipping Address",
          placeholder: "221B Baker Street",
          required: true,
          minLength: 8,
          maxLength: 120,
          col: 12,
          dependsOn: {
            field: "equipmentNeeded",
            operator: "===",
            value: true
          }
        }
      ]
    },
    {
      id: "review",
      title: "Final Confirmation",
      description: "Confirm the details below and submit.",
      fields: [
        {
          type: "checkbox",
          name: "acceptPolicies",
          label: "Agreements",
          fullWidth: true,
          options: [
            {
              label: "I agree to the Privacy Policy and Terms.",
              value: "agreed"
            }
          ],
          validation: {
            required: true,
            messageRequired: "You must accept the policy before submission."
          }
        }
      ]
    }
  ]
};

class FormEngine {
  constructor({ schema, rootSelector }) {
    this.schema = schema;
    this.mountEl = document.querySelector(rootSelector);
    this.currentStep = 0;
    this.formData = {};
    this.errors = {};
    this.fieldRefs = new Map();
    this.stepRefs = [];
    this.progressRefs = {};
    this.submitMessageEl = null;
    this.debugOutputEl = null;

    this.loadState();
    this.initializeFormData();
    this.render();
    this.attachGlobalEvents();
    this.evaluateAllDependencies();
    this.renderCurrentStep(true);
    this.updateProgressUI();
    this.updateDebugOutput();
  }

  isRequired(field) {
    return Boolean(field.required || field.validation?.required);
  }

  getRequiredErrorMessage(field) {
    return field.validation?.messageRequired || "This field is required.";
  }

  initializeFormData() {
    this.schema.steps.forEach(step => {
      step.fields.forEach(field => {
        if (!(field.name in this.formData)) {
          if (field.type === "checkbox") {
            this.formData[field.name] = false;
          } else {
            this.formData[field.name] = "";
          }
        }
      });
    });
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.schema.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        this.formData = parsed.formData || {};
        this.currentStep = Number.isInteger(parsed.currentStep) ? parsed.currentStep : 0;
      }
    } catch (error) {
      console.warn("Failed to load form state:", error);
    }
  }

  saveState() {
    try {
      localStorage.setItem(
        this.schema.storageKey,
        JSON.stringify({
          formData: this.formData,
          currentStep: this.currentStep
        })
      );
    } catch (error) {
      console.warn("Failed to save form state:", error);
    }
  }

  clearSavedState() {
    localStorage.removeItem(this.schema.storageKey);
  }

  render() {
    this.mountEl.innerHTML = `
      <div class="form-card">
        <div class="form-header">
          <h1 class="form-title">${this.escapeHtml(this.schema.title)}</h1>
          <p class="form-subtitle">${this.escapeHtml(this.schema.subtitle || "")}</p>
        </div>

        <div class="progress-wrap">
          <div class="progress-meta">
            <span id="progress-label">Step 1 of ${this.schema.steps.length}</span>
            <span id="progress-percent">25%</span>
          </div>
          <div class="progress-bar" aria-hidden="true">
            <div id="progress-fill" class="progress-fill"></div>
          </div>
          <ol id="step-list" class="step-list"></ol>
        </div>

        <div class="form-body">
          <div id="steps-container"></div>
          <div id="submit-message" class="submit-message"></div>
          <pre id="debug-output" class="debug-output" aria-label="Form data preview"></pre>
        </div>

        <div class="nav-bar">
          <div class="nav-left">
            <button type="button" id="reset-btn" class="btn-danger">Reset</button>
          </div>
          <div class="nav-right">
            <button type="button" id="back-btn" class="btn-secondary">Back</button>
            <button type="button" id="next-btn" class="btn-primary">Next</button>
          </div>
        </div>
      </div>
    `;

    this.progressRefs = {
      label: this.mountEl.querySelector("#progress-label"),
      percent: this.mountEl.querySelector("#progress-percent"),
      fill: this.mountEl.querySelector("#progress-fill"),
      stepList: this.mountEl.querySelector("#step-list"),
      stepsContainer: this.mountEl.querySelector("#steps-container"),
      backBtn: this.mountEl.querySelector("#back-btn"),
      nextBtn: this.mountEl.querySelector("#next-btn"),
      resetBtn: this.mountEl.querySelector("#reset-btn")
    };

    this.submitMessageEl = this.mountEl.querySelector("#submit-message");
    this.debugOutputEl = this.mountEl.querySelector("#debug-output");

    this.renderStepList();
    this.renderSteps();
  }

  renderStepList() {
    this.progressRefs.stepList.innerHTML = this.schema.steps
      .map((step, index) => `<li data-step-index="${index}">${this.escapeHtml(step.title)}</li>`)
      .join("");
  }

  renderSteps() {
    this.progressRefs.stepsContainer.innerHTML = "";
    this.stepRefs = [];

    this.schema.steps.forEach((step, stepIndex) => {
      const panel = document.createElement("section");
      panel.className = "step-panel";
      panel.dataset.stepIndex = stepIndex;

      const fieldsHtml = step.fields.map(field => this.renderField(field)).join("");

      panel.innerHTML = `
        <h2 class="step-title">${this.escapeHtml(step.title)}</h2>
        <p class="step-description">${this.escapeHtml(step.description || "")}</p>
        <div class="form-grid">
          ${fieldsHtml}
        </div>
      `;

      this.progressRefs.stepsContainer.appendChild(panel);
      this.stepRefs.push(panel);

      step.fields.forEach(field => {
        const wrapper = panel.querySelector(`[data-field-name="${field.name}"]`);
        const inputEls = wrapper.querySelectorAll(`[data-input-name="${field.name}"]`);
        const errorEl = wrapper.querySelector(".field-error");

        this.fieldRefs.set(field.name, {
          field,
          wrapper,
          inputs: Array.from(inputEls),
          errorEl,
          stepIndex
        });

        this.applyFieldValue(field.name);
        this.bindFieldEvents(field.name);
      });
    });
  }

  renderField(field) {
    const spansWide = field.fullWidth || field.col === 12 || !field.col;
    const colClass = spansWide ? "" : "col-6";
    const requiredMark = this.isRequired(field) ? `<span class="required-mark">*</span>` : "";
    const helpText = field.helpText ? `<div class="field-help">${this.escapeHtml(field.helpText)}</div>` : "";

    let controlHtml = "";

    switch (field.type) {
      case "text":
      case "email":
      case "number":
        controlHtml = `
          <input
            class="field-control"
            type="${field.type}"
            id="${field.name}"
            data-input-name="${field.name}"
            name="${field.name}"
            placeholder="${this.escapeHtml(field.placeholder || "")}"
            autocomplete="off"
          />
        `;
        break;

      case "select":
        controlHtml = `
          <select
            class="field-select"
            id="${field.name}"
            data-input-name="${field.name}"
            name="${field.name}"
          >
            ${field.options
              .map(
                option => `
              <option value="${this.escapeHtml(String(option.value))}">
                ${this.escapeHtml(option.label)}
              </option>
            `
              )
              .join("")}
          </select>
        `;
        break;

      case "radio":
        controlHtml = `
          <div class="option-group" role="radiogroup" aria-labelledby="label-${field.name}">
            ${field.options
              .map(
                (option, idx) => `
              <label class="option-item" for="${field.name}-${idx}">
                <input
                  type="radio"
                  id="${field.name}-${idx}"
                  data-input-name="${field.name}"
                  name="${field.name}"
                  value="${this.escapeHtml(String(option.value))}"
                />
                <span>${this.escapeHtml(option.label)}</span>
              </label>
            `
              )
              .join("")}
          </div>
        `;
        break;

      case "checkbox": {
        const optionLabel = field.options?.[0]?.label || field.label;
        controlHtml = `
          <div class="option-group">
            <label class="option-item" for="${field.name}">
              <input
                type="checkbox"
                id="${field.name}"
                data-input-name="${field.name}"
                name="${field.name}"
              />
              <span>${this.escapeHtml(optionLabel)}</span>
            </label>
          </div>
        `;
        break;
      }

      default:
        controlHtml = `<div class="field-help">Unsupported field type: ${this.escapeHtml(field.type)}</div>`;
    }

    const labelHtml =
      field.type === "checkbox"
        ? field.label
          ? `<div id="label-${field.name}" class="field-label">${this.escapeHtml(field.label)}${requiredMark}</div>`
          : ""
        : `<label id="label-${field.name}" class="field-label" for="${field.name}">${this.escapeHtml(field.label)}${requiredMark}</label>`;

    return `
      <div class="field-wrap ${colClass}" data-field-name="${field.name}">
        ${labelHtml}
        ${controlHtml}
        ${helpText}
        <div class="field-error" aria-live="polite"></div>
      </div>
    `;
  }

  bindFieldEvents(fieldName) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return;

    ref.inputs.forEach(input => {
      const eventName =
        input.type === "radio" || input.type === "checkbox" || input.tagName === "SELECT"
          ? "change"
          : "input";

      input.addEventListener(eventName, () => {
        this.syncFieldValue(fieldName);
        this.evaluateAllDependencies();
        this.saveState();
        this.updateDebugOutput();
      });

      input.addEventListener("blur", () => {
        this.validateField(fieldName);
        this.updateDebugOutput();
      });
    });
  }

  attachGlobalEvents() {
    this.progressRefs.backBtn.addEventListener("click", () => this.goToPreviousStep());
    this.progressRefs.nextBtn.addEventListener("click", () => this.goToNextStep());
    this.progressRefs.resetBtn.addEventListener("click", () => this.resetForm());
  }

  syncFieldValue(fieldName) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return;

    const { field, inputs } = ref;
    let value = "";

    switch (field.type) {
      case "checkbox":
        value = !!inputs[0]?.checked;
        break;
      case "radio":
        value = inputs.find(input => input.checked)?.value || "";
        break;
      case "number":
        value = inputs[0]?.value ?? "";
        break;
      default:
        value = inputs[0]?.value ?? "";
    }

    this.formData[fieldName] = value;
    this.validateField(fieldName, false);
  }

  applyFieldValue(fieldName) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return;

    const { field, inputs } = ref;
    const value = this.formData[fieldName];

    switch (field.type) {
      case "checkbox":
        if (inputs[0]) inputs[0].checked = !!value;
        break;
      case "radio":
        inputs.forEach(input => {
          input.checked = input.value === String(value);
        });
        break;
      default:
        if (inputs[0]) inputs[0].value = value ?? "";
    }
  }

  evaluateAllDependencies() {
    this.schema.steps.forEach(step => {
      step.fields.forEach(field => {
        const ref = this.fieldRefs.get(field.name);
        if (!ref) return;

        const visible = this.isFieldVisible(field);
        ref.wrapper.classList.toggle("hidden", !visible);

        if (!visible) {
          this.clearFieldValue(field.name);
          this.clearFieldError(field.name);
        }
      });
    });

    this.saveState();
    this.updateDebugOutput();
  }

  isFieldVisible(field) {
    if (!field.dependsOn) return true;

    const { field: depField, operator, value } = field.dependsOn;
    const currentValue = this.formData[depField];

    switch (operator) {
      case "===":
        return currentValue === value;
      case "!==":
        return currentValue !== value;
      case ">":
        return Number(currentValue) > Number(value);
      case "<":
        return Number(currentValue) < Number(value);
      case ">=":
        return Number(currentValue) >= Number(value);
      case "<=":
        return Number(currentValue) <= Number(value);
      case "includes":
        return Array.isArray(currentValue)
          ? currentValue.includes(value)
          : String(currentValue).includes(String(value));
      default:
        return false;
    }
  }

  clearFieldValue(fieldName) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return;

    const { field } = ref;
    const emptyValue = field.type === "checkbox" ? false : "";

    if (this.formData[fieldName] !== emptyValue) {
      this.formData[fieldName] = emptyValue;
      this.applyFieldValue(fieldName);
    }
  }

  validateField(fieldName, showMessage = true) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return true;

    const { field, wrapper, errorEl } = ref;

    if (!this.isFieldVisible(field)) {
      delete this.errors[fieldName];
      wrapper.classList.remove("field-invalid");
      errorEl.textContent = "";
      return true;
    }

    const value = this.formData[fieldName];
    const stringValue = value == null ? "" : String(value).trim();
    const requiredMessage = this.getRequiredErrorMessage(field);

    let error = "";

    if (this.isRequired(field)) {
      if (field.type === "checkbox" && value !== true) {
        error = requiredMessage;
      } else if (field.type !== "checkbox" && stringValue === "") {
        error = requiredMessage;
      }
    }

    if (!error && stringValue !== "") {
      if (field.minLength && stringValue.length < field.minLength) {
        error = `Minimum length is ${field.minLength} characters.`;
      } else if (field.maxLength && stringValue.length > field.maxLength) {
        error = `Maximum length is ${field.maxLength} characters.`;
      } else if (field.pattern) {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(stringValue)) {
            error = "Invalid format.";
          }
        } catch (e) {
          error = "Validation pattern is invalid.";
        }
      }
    }

    if (error) {
      this.errors[fieldName] = error;
      wrapper.classList.add("field-invalid");
      if (showMessage) errorEl.textContent = error;
      return false;
    }

    delete this.errors[fieldName];
    wrapper.classList.remove("field-invalid");
    errorEl.textContent = "";
    return true;
  }

  validateStep(stepIndex, showMessages = true) {
    const step = this.schema.steps[stepIndex];
    let isValid = true;

    step.fields.forEach(field => {
      const valid = this.validateField(field.name, showMessages);
      if (!valid) isValid = false;
    });

    return isValid;
  }

  goToNextStep() {
    this.submitMessageEl.style.display = "none";
    const valid = this.validateStep(this.currentStep, true);
    if (!valid) return;

    if (this.currentStep < this.schema.steps.length - 1) {
      this.currentStep += 1;
      this.renderCurrentStep();
      this.updateProgressUI();
      this.saveState();
    } else {
      this.submitForm();
    }
  }

  goToPreviousStep() {
    this.submitMessageEl.style.display = "none";
    if (this.currentStep === 0) return;

    this.currentStep -= 1;
    this.renderCurrentStep();
    this.updateProgressUI();
    this.saveState();
  }

  renderCurrentStep(initial = false) {
    this.stepRefs.forEach((panel, index) => {
      panel.classList.remove("active", "visible");

      if (index === this.currentStep) {
        panel.classList.add("active");
        if (initial) {
          requestAnimationFrame(() => panel.classList.add("visible"));
        } else {
          requestAnimationFrame(() => panel.classList.add("visible"));
        }
      }
    });

    this.progressRefs.backBtn.disabled = this.currentStep === 0;
    this.progressRefs.nextBtn.textContent =
      this.currentStep === this.schema.steps.length - 1 ? "Submit" : "Next";
  }

  updateProgressUI() {
    const total = this.schema.steps.length;
    const current = this.currentStep + 1;
    const percent = Math.round((current / total) * 100);

    this.progressRefs.label.textContent = `Step ${current} of ${total}`;
    this.progressRefs.percent.textContent = `${percent}%`;
    this.progressRefs.fill.style.width = `${percent}%`;

    Array.from(this.progressRefs.stepList.children).forEach((item, index) => {
      item.classList.toggle("active", index === this.currentStep);
      item.classList.toggle("complete", index < this.currentStep);
    });
  }

  submitForm() {
    const valid = this.validateStep(this.currentStep, true);
    if (!valid) return;

    const payload = this.getVisibleDataOnly();
    this.submitMessageEl.style.display = "block";
    this.submitMessageEl.textContent = "Form submitted successfully. Saved state has been cleared.";
    this.debugOutputEl.textContent = JSON.stringify(payload, null, 2);
    this.clearSavedState();
    console.log("Submitted payload:", payload);
  }

  getVisibleDataOnly() {
    const output = {};

    this.schema.steps.forEach(step => {
      step.fields.forEach(field => {
        if (this.isFieldVisible(field)) {
          output[field.name] = this.formData[field.name];
        }
      });
    });

    return output;
  }

  clearFieldError(fieldName) {
    const ref = this.fieldRefs.get(fieldName);
    if (!ref) return;

    delete this.errors[fieldName];
    ref.wrapper.classList.remove("field-invalid");
    ref.errorEl.textContent = "";
  }

  resetForm() {
    this.formData = {};
    this.errors = {};
    this.currentStep = 0;
    this.clearSavedState();
    this.initializeFormData();

    this.schema.steps.forEach(step => {
      step.fields.forEach(field => {
        this.applyFieldValue(field.name);
        this.clearFieldError(field.name);
      });
    });

    this.evaluateAllDependencies();
    this.renderCurrentStep();
    this.updateProgressUI();
    this.updateDebugOutput();
    this.submitMessageEl.style.display = "none";
  }

  updateDebugOutput() {
    this.debugOutputEl.textContent = JSON.stringify(this.getVisibleDataOnly(), null, 2);
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FormEngine({
    rootSelector: "#form-root",
    schema: FORM_SCHEMA
  });
});