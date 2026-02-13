async function getEmailText() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: extractEmailText
      },
      (results) => resolve(results?.[0]?.result || null)
    );
  });
}

function extractEmailText() {
  // Gmail
  const gmail = document.querySelector("div.a3s");
  if (gmail) return gmail.innerText;
  // Outlook Web
  const outlook = document.querySelector("div[aria-label='Message body']");
  if (outlook) return outlook.innerText;
  return null;
}

function getThreatLevel(probability) {
  if (probability >= 80) return { level: 'CRITICAL THREAT', class: 'risk-critical' };
  if (probability >= 60) return { level: 'HIGH RISK', class: 'risk-high' };
  if (probability >= 30) return { level: 'MEDIUM RISK', class: 'risk-medium' };
  return { level: 'LOW RISK', class: 'risk-low' };
}

document.getElementById("analyze").onclick = async () => {
  const outputDiv = document.getElementById("output");
  
  // Show loading state
  outputDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Analyzing email for threats...</div>
    </div>
  `;
  
  const emailText = await getEmailText();
  
  if (!emailText) {
    outputDiv.innerHTML = `
      <div class="status-message">
        ⚠️ No email detected.<br>Please open an email first.
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: emailText.slice(0, 4000) })
    });
    
    const result = await response.json();
    
    if (result.error) {
      outputDiv.innerHTML = `
        <div class="error-message">
          <strong>⚠️ Analysis Error</strong><br>
          ${result.error}
        </div>
      `;
      return;
    }
    
    const threat = getThreatLevel(result.scam_probability);
    
    // Format triggers
    const triggersHTML = result.emotional_triggers
      .map(t => `<span class="tag">${t}</span>`)
      .join('');
    
    const mitreHTML = result.mitre_attack
      .map(t => `<span class="tag mitre-tag">${t}</span>`)
      .join('');
    
    outputDiv.innerHTML = `
      <div class="result-card">
        <div class="threat-level-banner ${threat.class}">
          <div class="threat-label">${threat.level}</div>
          <div class="probability-circle">${result.scam_probability}%</div>
        </div>
        
        <div class="details-section">
          <div class="section">
            <div class="section-title">
              <span class="icon">⚡</span>
              Emotional Triggers Detected
            </div>
            <div class="tag-container">
              ${triggersHTML || '<span class="tag">None detected</span>'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              <span class="icon">🎯</span>
              MITRE ATT&CK Techniques
            </div>
            <div class="tag-container">
              ${mitreHTML || '<span class="tag mitre-tag">None identified</span>'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">
              <span class="icon">💡</span>
              Recommendation
            </div>
            <div class="recommendation-box">
              ${result.recommendation}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    outputDiv.innerHTML = `
      <div class="error-message">
        <strong>🔌 Connection Error</strong><br>
        Unable to reach analysis server.<br>
        Make sure the backend is running on port 5000.
      </div>
    `;
  }
};