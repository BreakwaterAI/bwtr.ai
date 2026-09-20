export function inquiryPayload(form, pageUrl) {
  const input = new FormData(form);
  const industries = ['Airports', 'Healthcare', 'Power & utilities', 'Connected industry'];
  const interest = input.get('interest') || 'General';
  return new URLSearchParams({
    form_type: 'company_inquiry',
    name: input.get('name') || '',
    email: input.get('email') || '',
    company: input.get('organization') || '',
    industry: industries.includes(interest) ? interest : '',
    environment: interest === 'General' ? 'General inquiry' : interest,
    message: input.get('message') || '',
    website: input.get('website') || '',
    submitted_at: new Date().toISOString(),
    page_url: pageUrl,
  });
}

// Production candidate adapter. Built together with the same inquiryPayload
// function used by the offline integration rehearsal. Never loaded by that preview.
export function attachLeadForm(endpoint) {
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-form-status]');
  const interest = new URLSearchParams(location.search).get('interest');
  let sending = false;
  const restoreContext = () => {
    if ([...form.elements.interest.options].some(option => option.value === interest)) form.elements.interest.value = interest;
  };
  const report = (message, tone) => {
    status.hidden = false;
    status.textContent = message;
    status.dataset.tone = tone;
    status.focus();
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    if (form.elements.website.value) {
      form.reset(); restoreContext();
      report("Thanks. We'll follow up shortly.", 'success');
      return;
    }
    // Capture values before disabling any controls. Use the existing Apps Script
    // field names; organization and the selected context are mapped explicitly.
    const payload = inquiryPayload(form, location.href);
    const body = new FormData();
    for (const [key, value] of payload) body.append(key, value);
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    form.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = 'Sending inquiry…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body, signal: controller.signal });
      form.reset(); restoreContext();
      report('Submission sent. Delivery cannot be confirmed in this page; email hello@bwtr.ai if you do not hear back.', 'success');
    } catch {
      report('We could not submit the form. Please email hello@bwtr.ai.', 'error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      form.removeAttribute('aria-busy');
    }
  });
  restoreContext();
  // Keep the delivered HTML fail-closed until the submission handler exists.
  form.querySelector('fieldset').disabled = false;
  form.querySelector('[data-form-fallback]').hidden = true;
}

attachLeadForm(window.BREAKWATER_FORM_ENDPOINT || "https://script.google.com/macros/s/AKfycbyn7VeN_qJtlnNLMN_nzW_nMHmPXkt9SN_Qx-1AWk1im76oI9m9v0b_7ujn2SWa1z1N/exec");
