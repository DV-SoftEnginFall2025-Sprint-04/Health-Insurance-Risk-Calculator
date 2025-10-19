(function () {
  const statusEl = document.getElementById('serverStatus');
  const summaryEl = document.getElementById('calcSummary');
  const finalEl = document.getElementById('finalResult');
  const form = document.getElementById('riskForm');

  const API_BASE = window.API_BASE || 'http://localhost:5000';

  // wake
  async function pingServer() {
    try {
      const r = await fetch(`${API_BASE}/api/ping`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Bad status');
      const data = await r.json();
      statusEl.textContent = `API ready (time: ${data.time}).`;
    } catch (e) {
      statusEl.textContent = `Unable to reach API at ${API_BASE}. Check CORS and server status.`;
    }
  }
  pingServer();

  function setInvalid(fieldId, isInvalid) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    if (isInvalid) el.classList.add('invalid');
    else el.classList.remove('invalid');
  }

  //validation
  function validate() {
    let ok = true;

    const age = Number(document.getElementById('age').value);
    const weightLb = Number(document.getElementById('weightLb').value);
    const feet = Number(document.getElementById('feet').value);
    const inches = Number(document.getElementById('inches').value);
    const systolic = Number(document.getElementById('systolic').value);
    const diastolic = Number(document.getElementById('diastolic').value);

    // Age 0–100
    const ageBad = !(Number.isFinite(age) && age >= 0 && age <= 100);
    setInvalid('ageField', ageBad); ok = ok && !ageBad;

    // Weight 50–500
    const wBad = !(Number.isFinite(weightLb) && weightLb >= 50 && weightLb <= 500);
    setInvalid('weightField', wBad); ok = ok && !wBad;

    // Height feet 2–8, inches 0–11
    const ftBad = !(Number.isFinite(feet) && feet >= 2 && feet <= 8);
    setInvalid('heightFtField', ftBad); ok = ok && !ftBad;

    const inBad = !(Number.isFinite(inches) && inches >= 0 && inches <= 11);
    setInvalid('heightInField', inBad); ok = ok && !inBad;

    const totalInches = feet * 12 + inches;
    const minHeightBad = totalInches < 24; // Requirement: minimum height of 2 feet
    if (minHeightBad) { setInvalid('heightFtField', true); setInvalid('heightInField', true); ok = false; }

    // Blood pressure
    const sysBad = !(Number.isFinite(systolic) && systolic >= 70 && systolic <= 250);
    setInvalid('sysField', sysBad); ok = ok && !sysBad;

    const diaBad = !(Number.isFinite(diastolic) && diastolic >= 40 && diastolic <= 150);
    setInvalid('diaField', diaBad); ok = ok && !diaBad;

    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    finalEl.textContent = '';
    summaryEl.style.display = 'none';
    summaryEl.textContent = '';

    if (!validate()) {
      finalEl.textContent = 'Please correct the highlighted fields.';
      return;
    }

    
    const payload = {
      age: Number(document.getElementById('age').value),
      height: {
        feet: Number(document.getElementById('feet').value),
        inches: Number(document.getElementById('inches').value),
      },
      weightLb: Number(document.getElementById('weightLb').value),
      bloodPressure: {
        systolic: Number(document.getElementById('systolic').value),
        diastolic: Number(document.getElementById('diastolic').value),
      },
      familyHistory: {
        diabetes: document.getElementById('fh-diabetes').checked,
        cancer: document.getElementById('fh-cancer').checked,
        alzheimers: document.getElementById('fh-alz').checked,
      },
    };

    try {
      const res = await fetch(`${API_BASE}/api/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        finalEl.textContent = err.message || 'Server error. Check inputs or try again later.';
        return;
      }

      const data = await res.json();
      const fam = (data.inputs.family || []).join(', ') || 'None';
      summaryEl.innerHTML =
        `<strong>Calculation Summary</strong><br>
         Age: ${data.inputs.age}<br>
         Height (in): ${data.inputs.heightIn}<br>
         Weight (lb): ${data.inputs.weightLb}<br>
         BMI: ${data.inputs.bmi}<br>
         Blood Pressure Category: ${data.inputs.bpCategory}<br>
         Family Diseases: ${fam}<br>
         <br>
         Points — Age: ${data.points.age}, BMI: ${data.points.bmi}, BP: ${data.points.bloodPressure}, Family: ${data.points.family}<br>
         <strong>Total: ${data.points.total}</strong>`;
      summaryEl.style.display = 'block';
      finalEl.textContent = `Final Risk Category: ${data.riskCategory.toUpperCase()}`;
    } catch (err) {
      finalEl.textContent = `Network error calling ${API_BASE}/api/risk. Check CORS and server status.`;
    }
  });
})();
