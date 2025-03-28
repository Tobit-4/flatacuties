
const myUrl = 'https://my-app-backend-2-ai54.onrender.com/api/'

let cropsData = [];
let regionData = [];

document.addEventListener('DOMContentLoaded',()=>{

    fetch(`${myUrl}crops`)
    .then(resp=>resp.json())
    .then(crops=>{
        cropsData = crops;

        fetch(`${myUrl}regions`)
        .then(response=>response.json())
        .then(region=>{
            regionData = region;
            cropCalc();
            regionAdvisor();
        })

    })
})

//setting up calculator

function cropCalc(){
    const dropdown = document.getElementById('calculator');

    dropdown.innerHTML+=`
    <div class="calculator-form">
      <div class="input-group">
        <label for="crop-select">Select Crop:</label>
        <select id="crop-select">
          <option value="">-Select-</option>
          ${cropsData.map(crop => `
            <option value="${crop.id}">${crop.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="input-group">
        <label for="tray-size">Tray Size (sq ft):</label>
        <input type="number" id="tray-size" min="0.1" step="0.1" value="1">
      </div>
      <button id="calculate-btn">Calculate</button>
      <div id="calculator-results"></div>
    </div>
  `;
            //Event listener
    document.getElementById('calculate-btn').addEventListener('click',calculateResults)
}

function calculateResults(){
    const cropId = parseInt(document.getElementById('crop-select').value);
    const traySize = parseFloat(document.getElementById('tray-size').value);
    const currentHumidity = 65;
    const currentTemp = 25;

    const cropSelected = cropsData.find(s=>s.id === cropId);

    //Handle errors
    if(!cropSelected || isNaN(traySize)){
        alert("Please select a crop and enter a valid tray size");
        return;
    }
    //calculation
    const harvestdate = new Date();
    harvestdate.setDate(harvestdate.getDate() + cropSelected.daysToHarvest);

    const yieldAmount = cropSelected.yieldPerAcre * traySize
    const seedReq = cropSelected.seedRatePerAcre
    ? `${(cropSelected.seedRatePerAcre * traySize / 43560).toFixed(4)} kg` 
    : `${Math.ceil(cropSelected.seedlingsPerAcre * traySize / 43560)} seedlings`;

    //Results
    const riskAlerts = calculateRiskAlert(cropSelected,currentHumidity,currentTemp)
    
let resultHtml = `
    <div class="result-card">
      <h4>${cropSelected.name} Growing Plan</h4>
      <p>📅 <strong>Harvest Date:</strong> ${harvestdate.toDateString()}</p>
      <p>⚖️ <strong>Expected Yield:</strong> ${yieldAmount.toFixed(1)} ${cropSelected.yieldPerAcre || 'units'}</p>
      <p>🌱 <strong>Seed Needed:</strong> ${seedReq}</p>
      <p>💡 <strong>Light Needed:</strong> ${cropSelected.optimalLightHours} hours/day</p>
    </div>
    `;
    if (riskAlerts.length > 0) {
      resultHtml += `<div class="risk-alerts">`;
      resultHtml += `<h4> ‼️ Risk Alerts</h4>`;
      riskAlerts.forEach(alert => {
          resultHtml += `<p class="alert ${alert.severity}">${alert.message}</p>`;
      });

        if(cropSelected.susceptibleTo && cropSelected.susceptibleTo.length>0){
          resultHtml +=`
            <button id="view-diseases-btn" class="disease button">
              View all potential diseases for ${cropSelected.name}
            </button>

            <div id="diseases-list" style="display:none;">
            <h5>Common Humidity related diseases:</h5>
            <ul>
              ${cropSelected.susceptibleTo.map(disease=>`<li>${disease}</li>`).join('')}
          `
        }

      resultHtml += `</div>`
  }
  resultHtml += `</div>`

  document.getElementById('calculator-results').innerHTML = resultHtml;

  const viewDisBtn = document.getElementById('view-diseases-btn')

  if (viewDisBtn) {
    viewDisBtn.addEventListener('click', function() {
        const diseasesList = document.getElementById('diseases-list');
        if (diseasesList.style.display === 'none') {
            diseasesList.style.display = 'block';
            this.textContent = `Hide Diseases for ${cropSelected.name}`;
        } else {
            diseasesList.style.display = 'none';
            this.textContent = `View All Potential Diseases for ${cropSelected.name}`;
        }
    });
  }
}


//Region info
function regionAdvisor(){
    const regionDiv = document.getElementById('regnInfo');
    const button = document.getElementById('view');
    button.classList.add("button");

    const regionsContainer = document.createElement('div');
    regionsContainer.id = 'regions-container';
    regionsContainer.style.display = 'none';
    regionDiv.appendChild(regionsContainer)

        regionData.forEach(regn=>{
            const cropNames = regn.bestCrops.map(cropName =>{
                const crup = cropsData.find(c => c.name === cropName)

                return crup ? crup.name : cropName;
        }).filter(name => name !== 'Unknown')

        const regionCard = document.createElement('div');
        regionCard.className = 'region-card';
        regionCard.innerHTML = `
            <h4>${regn.name}</h4>
            <p>📍 Altitude: ${regn.altitude[0]}m - ${regn.altitude[1]}m</p>
            <p>🌱 Best Crops: ${cropNames.join(', ')}</p>
        `;
        regionsContainer.appendChild(regionCard);
    });
    
  
    button.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (regionsContainer.style.display === 'none') {
            regionsContainer.style.display = 'block';
            button.textContent = 'Hide Regions';
        } else {
            regionsContainer.style.display = 'none';
            button.textContent = 'View Regions';
        }
    });
} 


//Risk alerts

function calculateRiskAlert(crop, currentHumidity, currentTemp) {
  const alerts = [];
  
  
  if (!crop || typeof crop !== 'object') {
      return alerts;
  }

  // Humidity checks
  if (typeof crop.maxIdealHumidity === 'number' && typeof crop.minIdealHumidity === 'number') {
      if (currentHumidity > crop.maxIdealHumidity) {
          alerts.push({
              type: "high-humidity",
              message: `⚠️ High humidity warning (${currentHumidity}%). ${crop.name} prefers humidity below ${crop.maxIdealHumidity}%. Risk of mold/fungi increases above this level.`,
              severity: currentHumidity > crop.maxIdealHumidity + 15 ? "high" : "medium"
          });
      } else if (currentHumidity < crop.minIdealHumidity) {
          alerts.push({
              type: "low-humidity",
              message: `⚠️ Low humidity warning (${currentHumidity}%). ${crop.name} prefers humidity above ${crop.minIdealHumidity}%. Plants may dry out.`,
              severity: "low"
          });
      }
  }
  
  // Temperature checks
  if (typeof crop.maxIdealTemp === 'number' && typeof crop.minIdealTemp === 'number') {
      if (currentTemp > crop.maxIdealTemp) {
          alerts.push({
              type: "high-temp",
              message: `🌡️ High temperature warning (${currentTemp}°C). ${crop.name} prefers temperatures below ${crop.maxIdealTemp}°C.`,
              severity: "medium"
          });
      } else if (currentTemp < crop.minIdealTemp) {
          alerts.push({
              type: "low-temp",
              message: `❄️ Low temperature warning (${currentTemp}°C). ${crop.name} prefers temperatures above ${crop.minIdealTemp}°C. Growth may slow.`,
              severity: "medium"
          });
      }
  }
  
  // Crop-specific warnings
  if (Array.isArray(crop.susceptibleTo)) {
      if (crop.susceptibleTo.includes("mold") && currentHumidity > 70) {
          alerts.push({
              type: "mold-risk",
              message: "🍄 High mold risk for this crop at current humidity levels. Ensure good air circulation.",
              severity: "high"
          });
      }
      
      crop.susceptibleTo.forEach(disease => {
          if (typeof disease === 'string') {
              const lowerDisease = disease.toLowerCase();
              if (lowerDisease.includes("blight") && currentHumidity > 75) {
                  alerts.push({
                      type: "disease-risk",
                      message: `⚠️ High risk of ${disease} in current conditions. Consider preventive measures.`,
                      severity: "high"
                  });
              } else if (lowerDisease.includes("rot") && currentHumidity > 80) {
                  alerts.push({
                      type: "disease-risk",
                      message: `⚠️ High risk of ${disease} in current conditions. Improve drainage.`,
                      severity: "high"
                  });
              }
          }
      });
  }
  
  return alerts;
}
