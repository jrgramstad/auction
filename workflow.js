// Team Workflow functionality
const workflow = {
  currentStage: 1,
  currentPropertyIndex: 0,
  properties: [],

  // Show specific stage
  async showStage(stage) {
    this.currentStage = stage;
    this.currentPropertyIndex = 0;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.stage) === stage) {
        btn.classList.add('active');
      }
    });

    // Update stage content
    document.querySelectorAll('.stage-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`stage${stage}Content`).classList.add('active');

    // Load properties for this stage
    await this.loadStageProperties(stage);
    this.renderCurrentProperty();
  },

  // Load properties for a specific stage
  async loadStageProperties(stage) {
    const currentAuctionId = await loadCurrentAuction();
    if (!currentAuctionId) {
      this.properties = [];
      return;
    }

    this.properties = await db.getPropertiesForStage(currentAuctionId, stage);
    document.getElementById(`stage${stage}Count`).textContent = this.properties.length;
  },

  // Render current property
  renderCurrentProperty() {
    const viewId = `stage${this.currentStage}PropertyView`;
    const viewDiv = document.getElementById(viewId);

    if (this.properties.length === 0) {
      viewDiv.innerHTML = '<div class="empty-state">No properties need review at this stage</div>';
      return;
    }

    const property = this.properties[this.currentPropertyIndex];
    const methodName = `renderStage${this.currentStage}`;

    if (typeof this[methodName] === 'function') {
      viewDiv.innerHTML = this[methodName](property);
    }
  },

  // STAGE 1 (Jessica)
  renderStage1(property) {
    return `
      <div class="property-workflow">
        <div class="workflow-header">
          <h3>${property.address}</h3>
          <p>${property.city}, ${property.county} County</p>
          <div class="progress-indicator">
            Property ${this.currentPropertyIndex + 1} of ${this.properties.length}
          </div>
        </div>

        <div class="workflow-body">
          <div class="property-details">
            <p><strong>Property Type:</strong> ${property.property_type || 'N/A'}</p>
            <p><strong>Year Built:</strong> ${property.year_built || 'N/A'}</p>
            <p><strong>Size:</strong> ${property.sqft ? property.sqft.toLocaleString() + ' sqft' : 'N/A'}</p>
            <p><strong>Bedrooms:</strong> ${property.bedrooms || 'N/A'}</p>
            <p><strong>Bathrooms:</strong> ${property.bathrooms || 'N/A'}</p>
            <p><strong>Auto Score:</strong> ${property.auto_score || 'N/A'}</p>
          </div>

          <div class="workflow-actions">
            <div class="action-group">
              <label>On Auction Site:</label>
              <div class="button-group">
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'on_auction_site', 'YES')">YES</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'on_auction_site', 'NO')">NO</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'on_auction_site', 'REMOVED')">REMOVED</button>
              </div>
              <span id="field_on_auction_site">${property.on_auction_site || ''}</span>
            </div>

            <div class="action-group">
              <label>Pool (Satellite Check):</label>
              <div class="button-group">
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_satellite', 'Y')">YES</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_satellite', 'N')">NO</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_satellite', 'Unknown')">?</button>
              </div>
              <span id="field_pool_satellite">${property.pool_satellite || ''}</span>
            </div>

            <div class="action-group">
              <label>Realtor Value ($):</label>
              <input type="number" id="realtor_value" value="${property.realtor_value || ''}" placeholder="350000" />
            </div>

            <div class="action-group">
              <label>Last Sold Date:</label>
              <input type="date" id="last_sold_date" value="${property.last_sold_date || ''}" />
            </div>

            <div class="action-group">
              <label>Last Sold Price ($):</label>
              <input type="number" id="last_sold_price" value="${property.last_sold_price || ''}" placeholder="325000" />
            </div>

            <div class="action-group">
              <label>Notes:</label>
              <textarea id="stage_1_notes" rows="3">${property.stage_1_notes || ''}</textarea>
            </div>
          </div>

          <div class="workflow-footer">
            <button class="btn btn-secondary" onclick="workflow.skipProperty()" ${this.currentPropertyIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn btn-primary" onclick="workflow.completeStage1(${property.id})">
              Complete & Next →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async completeStage1(propertyId) {
    const updates = {
      on_auction_site: document.getElementById('field_on_auction_site')?.textContent || null,
      pool_satellite: document.getElementById('field_pool_satellite')?.textContent || null,
      realtor_value: parseFloat(document.getElementById('realtor_value').value) || null,
      last_sold_date: document.getElementById('last_sold_date').value || null,
      last_sold_price: parseFloat(document.getElementById('last_sold_price').value) || null,
      stage_1_notes: document.getElementById('stage_1_notes').value,
      stage_1_complete: true,
      stage_1_completed_by: 'Jessica',
      stage_1_completed_at: new Date().toISOString()
    };

    // Recalculate auto score with new data
    const property = await db.getProperty(propertyId);
    const updatedProperty = { ...property, ...updates };
    updatedProperty.auto_score = calculateAutoScore(updatedProperty);

    // Recheck exclusions
    const finalProperty = checkExclusions(updatedProperty);

    await db.updateProperty(propertyId, {
      ...updates,
      auto_score: finalProperty.auto_score,
      is_excluded: finalProperty.is_excluded,
      exclusion_reason: finalProperty.exclusion_reason
    });

    app.showToast('Stage 1 completed!', 'success');
    await this.nextProperty();
  },

  // STAGE 2 (Kalen)
  renderStage2(property) {
    return `
      <div class="property-workflow">
        <div class="workflow-header">
          <h3>${property.address}</h3>
          <p>${property.city}, ${property.county} County</p>
          <div class="progress-indicator">
            Property ${this.currentPropertyIndex + 1} of ${this.properties.length}
          </div>
        </div>

        <div class="workflow-body">
          <div class="property-details">
            <p><strong>Auto Score:</strong> ${property.auto_score || 'N/A'}</p>
            <p><strong>On Auction Site:</strong> ${property.on_auction_site || 'N/A'}</p>
            <p><strong>Pool (Roddy):</strong> ${property.pool_roddy || 'N/A'}</p>
            <p><strong>Pool (Satellite):</strong> ${property.pool_satellite || 'N/A'}</p>
            <p><strong>Realtor Value:</strong> ${property.realtor_value ? '$' + property.realtor_value.toLocaleString() : 'N/A'}</p>
            <p><strong>Stage 1 Notes:</strong> ${property.stage_1_notes || 'None'}</p>
          </div>

          <div class="workflow-actions">
            <div class="action-group">
              <label><strong>Final Pool Check:</strong></label>
              <div class="button-group">
                <button class="btn btn-danger" onclick="workflow.excludeProperty(${property.id}, 'Has Pool')">HAS POOL (Exclude)</button>
                <button class="btn btn-success" onclick="workflow.setFieldValue(${property.id}, 'pool_final', 'NO')">NO POOL ✓</button>
              </div>
              <span id="field_pool_final"></span>
            </div>

            <div class="action-group">
              <label><strong>Solar Panels Check:</strong></label>
              <div class="button-group">
                <button class="btn btn-danger" onclick="workflow.excludeProperty(${property.id}, 'Has Solar Panels')">HAS SOLAR (Exclude)</button>
                <button class="btn btn-success" onclick="workflow.setFieldValue(${property.id}, 'solar_final', 'NO')">NO SOLAR ✓</button>
              </div>
              <span id="field_solar_final"></span>
            </div>

            <div class="action-group">
              <label>Pool (Realtor):</label>
              <div class="button-group">
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_realtor', 'Y')">YES</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_realtor', 'N')">NO</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'pool_realtor', 'Unknown')">?</button>
              </div>
              <span id="field_pool_realtor">${property.pool_realtor || ''}</span>
            </div>

            <div class="action-group">
              <label>Notes:</label>
              <textarea id="stage_2_notes" rows="3">${property.stage_2_notes || ''}</textarea>
            </div>
          </div>

          <div class="workflow-footer">
            <button class="btn btn-secondary" onclick="workflow.skipProperty()" ${this.currentPropertyIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn btn-primary" onclick="workflow.completeStage2(${property.id})">
              Complete & Next →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async completeStage2(propertyId) {
    const updates = {
      pool_realtor: document.getElementById('field_pool_realtor')?.textContent || null,
      stage_2_notes: document.getElementById('stage_2_notes').value,
      stage_2_complete: true,
      stage_2_completed_by: 'Kalen',
      stage_2_completed_at: new Date().toISOString()
    };

    await db.updateProperty(propertyId, updates);
    app.showToast('Stage 2 completed!', 'success');
    await this.nextProperty();
  },

  async excludeProperty(propertyId, reason) {
    if (confirm(`Are you sure you want to exclude this property?\n\nReason: ${reason}`)) {
      await db.updateProperty(propertyId, {
        is_excluded: true,
        exclusion_reason: reason,
        has_pool: reason.includes('Pool') ? true : undefined,
        has_solar: reason.includes('Solar') ? true : undefined
      });

      app.showToast('Property excluded', 'warning');
      await this.nextProperty();
    }
  },

  // STAGE 3 (Christian)
  renderStage3(property) {
    return `
      <div class="property-workflow">
        <div class="workflow-header">
          <h3>${property.address}</h3>
          <p>${property.city}, ${property.county} County</p>
          <div class="progress-indicator">
            Property ${this.currentPropertyIndex + 1} of ${this.properties.length}
          </div>
        </div>

        <div class="workflow-body">
          <div class="property-details">
            <p><strong>Auto Score:</strong> ${property.auto_score || 'N/A'}</p>
            <p><strong>Year Built:</strong> ${property.year_built || 'N/A'}</p>
            <p><strong>Size:</strong> ${property.sqft ? property.sqft.toLocaleString() + ' sqft' : 'N/A'}</p>
            <p><strong>Realtor Value:</strong> ${property.realtor_value ? '$' + property.realtor_value.toLocaleString() : 'N/A'}</p>
          </div>

          <div class="workflow-actions">
            <div class="action-group">
              <label>Photo Condition:</label>
              <div class="button-group">
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'photo_condition', 'Excellent')">Excellent</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'photo_condition', 'Good')">Good</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'photo_condition', 'Fair')">Fair</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'photo_condition', 'Poor')">Poor</button>
              </div>
              <span id="field_photo_condition">${property.photo_condition || ''}</span>
            </div>

            <div class="action-group">
              <label>Manual Score (1-10):</label>
              <input type="range" id="manual_score" min="1" max="10" value="${property.manual_score || 5}"
                     oninput="document.getElementById('manual_score_value').textContent = this.value" />
              <span id="manual_score_value">${property.manual_score || 5}</span>
            </div>

            <div class="action-group">
              <label>Renovation Notes:</label>
              <textarea id="renovation_notes" rows="4">${property.renovation_notes || ''}</textarea>
            </div>
          </div>

          <div class="workflow-footer">
            <button class="btn btn-secondary" onclick="workflow.skipProperty()" ${this.currentPropertyIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn btn-primary" onclick="workflow.completeStage3(${property.id})">
              Complete & Next →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async completeStage3(propertyId) {
    const updates = {
      photo_condition: document.getElementById('field_photo_condition')?.textContent || null,
      manual_score: parseInt(document.getElementById('manual_score').value),
      renovation_notes: document.getElementById('renovation_notes').value,
      stage_3_complete: true,
      stage_3_completed_by: 'Christian',
      stage_3_completed_at: new Date().toISOString()
    };

    await db.updateProperty(propertyId, updates);
    app.showToast('Stage 3 completed!', 'success');
    await this.nextProperty();
  },

  // STAGE 4 (JR)
  renderStage4(property) {
    const calculatedBid = calculateMaxBid({ ...property, jr_grade: 7 });

    return `
      <div class="property-workflow">
        <div class="workflow-header">
          <h3>${property.address}</h3>
          <p>${property.city}, ${property.county} County</p>
          <div class="progress-indicator">
            Property ${this.currentPropertyIndex + 1} of ${this.properties.length}
          </div>
        </div>

        <div class="workflow-body">
          <div class="property-details">
            <p><strong>Auto Score:</strong> ${property.auto_score || 'N/A'}</p>
            <p><strong>Manual Score:</strong> ${property.manual_score || 'N/A'}</p>
            <p><strong>Photo Condition:</strong> ${property.photo_condition || 'N/A'}</p>
            <p><strong>Realtor Value:</strong> ${property.realtor_value ? '$' + property.realtor_value.toLocaleString() : 'N/A'}</p>
            <p><strong>Renovation Notes:</strong> ${property.renovation_notes || 'None'}</p>
          </div>

          <div class="workflow-actions">
            <div class="action-group">
              <label>JR Grade (1-10):</label>
              <select id="jr_grade" onchange="workflow.updateBidCalculation(${property.id})">
                ${[1,2,3,4,5,6,7,8,9,10].map(i => `<option value="${i}" ${property.jr_grade === i ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
            </div>

            <div class="action-group">
              <label>Title Status:</label>
              <div class="button-group">
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'title_status', 'Clean')">Clean</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'title_status', 'Minor Issues')">Minor Issues</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'title_status', 'Major Issues')">Major Issues</button>
              </div>
              <span id="field_title_status">${property.title_status || ''}</span>
            </div>

            <div class="action-group">
              <label>Title Notes:</label>
              <textarea id="title_issues" rows="2">${property.title_issues || ''}</textarea>
            </div>

            <div class="action-group">
              <label>Priority Level:</label>
              <select id="priority_level">
                <option value="1" ${property.priority_level === 1 ? 'selected' : ''}>1 - Never Drop</option>
                <option value="2" ${property.priority_level === 2 ? 'selected' : ''}>2 - Protect</option>
                <option value="3" ${property.priority_level === 3 ? 'selected' : ''}>3 - Normal</option>
                <option value="4" ${property.priority_level === 4 ? 'selected' : ''}>4 - Drop First</option>
              </select>
            </div>

            <div class="action-group">
              <label>Max Bid (Formula):</label>
              <input type="text" id="max_bid_formula" value="$${calculatedBid.toLocaleString()}" readonly />
            </div>

            <div class="action-group">
              <label>Feel Adjustment (+/-):</label>
              <input type="number" id="feel_adjustment" value="${property.feel_adjustment || 0}"
                     oninput="workflow.updateFinalBid(${property.id})" />
            </div>

            <div class="action-group">
              <label><strong>Final Max Bid:</strong></label>
              <input type="text" id="final_max_bid" value="$${(calculatedBid + (property.feel_adjustment || 0)).toLocaleString()}" readonly />
            </div>
          </div>

          <div class="workflow-footer">
            <button class="btn btn-secondary" onclick="workflow.skipProperty()" ${this.currentPropertyIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn btn-primary" onclick="workflow.completeStage4(${property.id})">
              Mark Ready & Next →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  updateBidCalculation(propertyId) {
    const jr_grade = parseInt(document.getElementById('jr_grade').value);
    const property = this.properties.find(p => p.id === propertyId);
    const calculatedBid = calculateMaxBid({ ...property, jr_grade });

    document.getElementById('max_bid_formula').value = '$' + calculatedBid.toLocaleString();
    this.updateFinalBid(propertyId);
  },

  updateFinalBid(propertyId) {
    const formulaBid = parseFloat(document.getElementById('max_bid_formula').value.replace(/[$,]/g, ''));
    const adjustment = parseFloat(document.getElementById('feel_adjustment').value) || 0;
    const finalBid = formulaBid + adjustment;

    document.getElementById('final_max_bid').value = '$' + finalBid.toLocaleString();
  },

  async completeStage4(propertyId) {
    const jr_grade = parseInt(document.getElementById('jr_grade').value);
    const property = this.properties.find(p => p.id === propertyId);
    const max_bid_formula = calculateMaxBid({ ...property, jr_grade });

    const updates = {
      jr_grade,
      title_status: document.getElementById('field_title_status')?.textContent || null,
      title_issues: document.getElementById('title_issues').value,
      priority_level: parseInt(document.getElementById('priority_level').value),
      max_bid_formula,
      feel_adjustment: parseFloat(document.getElementById('feel_adjustment').value) || 0,
      final_max_bid: max_bid_formula + (parseFloat(document.getElementById('feel_adjustment').value) || 0),
      stage_4_complete: true,
      stage_4_completed_at: new Date().toISOString()
    };

    await db.updateProperty(propertyId, updates);
    app.showToast('Stage 4 completed - Property ready to bid!', 'success');
    await this.nextProperty();
  },

  // STAGE 5 (Post-Auction)
  renderStage5(property) {
    return `
      <div class="property-workflow">
        <div class="workflow-header">
          <h3>${property.address}</h3>
          <p>${property.city}, ${property.county} County</p>
          <div class="progress-indicator">
            Property ${this.currentPropertyIndex + 1} of ${this.properties.length}
          </div>
        </div>

        <div class="workflow-body">
          <div class="property-details">
            <p><strong>JR Grade:</strong> ${property.jr_grade || 'N/A'}</p>
            <p><strong>Final Max Bid:</strong> ${property.final_max_bid ? '$' + property.final_max_bid.toLocaleString() : 'N/A'}</p>
            <p><strong>Priority Level:</strong> ${property.priority_level || 'N/A'}</p>
          </div>

          <div class="workflow-actions">
            <div class="action-group">
              <label>Opening Bid (Actual):</label>
              <input type="number" id="opening_bid_actual" value="${property.opening_bid_actual || ''}" placeholder="250000" />
            </div>

            <div class="action-group">
              <label>Our Bid Placed:</label>
              <input type="number" id="our_bid_placed" value="${property.our_bid_placed || ''}" placeholder="275000" />
            </div>

            <div class="action-group">
              <label>Winning Bid:</label>
              <input type="number" id="winning_bid" value="${property.winning_bid || ''}" placeholder="280000" />
            </div>

            <div class="action-group">
              <label>Outcome:</label>
              <div class="button-group">
                <button class="btn btn-sm btn-success" onclick="workflow.setFieldValue(${property.id}, 'outcome', 'WON')">WON</button>
                <button class="btn btn-sm btn-danger" onclick="workflow.setFieldValue(${property.id}, 'outcome', 'LOST')">LOST</button>
                <button class="btn btn-sm btn-secondary" onclick="workflow.setFieldValue(${property.id}, 'outcome', 'NO_BID')">NO BID</button>
                <button class="btn btn-sm btn-warning" onclick="workflow.setFieldValue(${property.id}, 'outcome', 'OUT_OF_FUNDS')">OUT OF FUNDS</button>
                <button class="btn btn-sm" onclick="workflow.setFieldValue(${property.id}, 'outcome', 'CANCELED')">CANCELED</button>
              </div>
              <span id="field_outcome">${property.outcome || ''}</span>
            </div>
          </div>

          <div class="workflow-footer">
            <button class="btn btn-secondary" onclick="workflow.skipProperty()" ${this.currentPropertyIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn btn-primary" onclick="workflow.completeStage5(${property.id})">
              Save & Next →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async completeStage5(propertyId) {
    const winningBid = parseFloat(document.getElementById('winning_bid').value) || null;
    const property = await db.getProperty(propertyId);

    const updates = {
      opening_bid_actual: parseFloat(document.getElementById('opening_bid_actual').value) || null,
      our_bid_placed: parseFloat(document.getElementById('our_bid_placed').value) || null,
      winning_bid: winningBid,
      outcome: document.getElementById('field_outcome')?.textContent || null,
      equity_percent: winningBid && property.realtor_value ? calculateEquityPercent({ ...property, winning_bid: winningBid }) : null,
      stage_5_complete: true,
      stage_5_completed_at: new Date().toISOString()
    };

    await db.updateProperty(propertyId, updates);
    app.showToast('Stage 5 completed!', 'success');
    await this.nextProperty();
  },

  // Helper functions
  setFieldValue(propertyId, fieldName, value) {
    const spanElement = document.getElementById(`field_${fieldName}`);
    if (spanElement) {
      spanElement.textContent = value;
    }
  },

  async nextProperty() {
    this.currentPropertyIndex++;
    if (this.currentPropertyIndex >= this.properties.length) {
      // Reload to see if there are more properties
      await this.loadStageProperties(this.currentStage);
      this.currentPropertyIndex = 0;
    }
    this.renderCurrentProperty();
  },

  async skipProperty() {
    if (this.currentPropertyIndex > 0) {
      this.currentPropertyIndex--;
      this.renderCurrentProperty();
    }
  }
};
